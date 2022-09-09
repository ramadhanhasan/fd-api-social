const express = require('express');
const socketIo = require('socket.io');
const needle = require('needle');
const http = require('http');
const path = require('path');
const config = require('dotenv').config()

const app = express()

const server = http.createServer(app)
const io = socketIo(server)

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'view', 'index.html'));
})

const token = process.env.TWITTER_TOKEN;
const port = process.env.PORT || 3000;
const rulesUrl = process.env.RULES_URL;
const streamUrl = process.env.STREAM_URL;
const keyword = process.env.KEYWORD;

async function getKeyword() {
    const response = await needle('get', rulesUrl, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })
    console.log(response.body,'RES')
    return response.body
}

async function setKeyword() {
    const data = {
        add: [{ value: keyword }],
    }
    const response = await needle('post', rulesUrl, data, {
        headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
        }
    })
    return response.body
}

async function deleteKeyword(keyword) {
    if (!Array.isArray(keyword.data)) {
         return null
    }
    const ids = keyword.data.map((key) => key.id)
    const data = {
        delete: {
            ids: ids,
        }
    }
    const response = await needle('post', rulesUrl, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    })
    return response.body
}

function streamTweet(socket) {
    const stream = needle.get(streamUrl, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })
    stream.on('data', (data) => {
        try {
            const json = JSON.parse(data)
            socket.emit('tweet', json)
        } catch (error) {
            
        }
    })
    return stream
}

io.on('connection', async () => {
    let currentKeyword
    try {
        currentKeyword = await getKeyword()
        await deleteKeyword(currentKeyword)
        await setKeyword()
    }catch(error) {
        process.exit(1)
    }
    const filteredStream = streamTweet(io)
    let timeout = 0
    filteredStream.on('timeout', () => {
        console.warn('A connection error. Reconnecting…')
        setTimeout(() => {
            timeout++
            streamTweet(io)
        }, 2 ** timeout)
        streamTweet(io)
    })
})


server.listen(port, () => {
    console.log(`Starting on port ${port}`)
})