const express = require('express');
const request = require('request');
const cors = require('cors');
const app = express();

app.use(cors());

// 1. Add error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

// 2. Extract API configuration
const API_CONFIG = {
    baseUrl: 'https://qbreader.org/api',
    endpoints: {
        randomTossup: '/random-tossup',
        randomBonus: '/random-bonus',
        tossupById: '/tossup-by-id',
        checkAnswer: '/check-answer'
    },
    defaultParams: {
        difficulties: '1,2,3,4,5,6',
        minYear: '2010',
        maxYear: '2025',
        powermarkOnly: 'true',
        standardOnly: 'true'
    },
    bonusParams: {
        difficulties: '1,2,3,4,5,6',
        minYear: '2010',
        maxYear: '2025',
        powermarkOnly: 'true',
        standardOnly: 'true',
        threePartBonuses: 'true'
    }
};

// 3. Implement request validation middleware
const validateRequest = (req, res, next) => {
    if (req.path === '/checkanswer' && (!req.query.questionid || !req.query.guess)) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    next();
};

// 4. Add response caching
const cache = new Map();
const cacheMiddleware = (req, res, next) => {
    const key = req.originalUrl;
    if (cache.has(key)) {
        return res.json(cache.get(key));
    }
    next();
};

app.use(validateRequest);
app.use(cacheMiddleware);
app.use(errorHandler);

app.get('/tossup', (req, res) => {
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.randomTossup}?${API_CONFIG.bonusParams}`;
    req.pipe(request(url)).pipe(res);
});

app.get('/bonus', (req, res) => {
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.randomBonus}?${API_CONFIG.bonusParams}`;
    req.pipe(request(url)).pipe(res);
});

app.get('/checkanswer', (req, res) => {
    const tossupByIdURL = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.tossupById}?id=${req.query.questionid}`;

    request(tossupByIdURL, (error, response, body) => {
        if (error) {
            return res.status(500).send(error);
        }

        // Handle "Invalid Tossup ID" response
        if (body === "Invalid Tossup ID") {
            return res.status(500).send({ error: "Invalid Tossup ID" });
        }

        try {
            const tossupById = JSON.parse(body);
            
            // Check if the response has the expected structure
            if (!tossupById || !tossupById.tossup || !tossupById.tossup.answer) {
                return res.status(500).send({ error: "Invalid response format from tossup-by-id API" });
            }

            const tossupAnswer = tossupById.tossup.answer;
            const guess = encodeURIComponent(req.query.guess); // Encode the guess parameter

            const directiveResponseURL = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.checkAnswer}?answerline=${encodeURIComponent(tossupAnswer)}&givenAnswer=${guess}`;

            request(directiveResponseURL, (error, response, body) => {
                if (error) {
                    return res.status(500).send(error);
                }

                // Check if the response status code is not successful (not in 2xx range)
                if (response.statusCode >= 300) {
                    return res.status(response.statusCode).send(body);
                }

                try {
                    const directiveResponse = JSON.parse(body);
                    res.json(directiveResponse);
                } catch (e) {
                    res.status(500).send({ error: "Failed to parse check-answer API response" });
                }
            });
        } catch (e) {
            res.status(500).send({ error: "Failed to parse tossup-by-id API response" });
        }
    });
});

app.listen(3000, () => {
    console.log('Proxy server running on http://localhost:3000');
});

module.exports = app;
