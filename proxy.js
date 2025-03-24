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
        bonusById: '/bonus-by-id',
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
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.randomTossup}?${API_CONFIG.defaultParams}`;
    req.pipe(request(url)).pipe(res);
});

app.get('/bonus', (req, res) => {
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.randomBonus}?${API_CONFIG.bonusParams}`;
    req.pipe(request(url)).pipe(res);
});

app.get('/checkanswer', (req, res) => {
    if (req.query.isBonus === 'true') {
        const bonusByIdURL = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.bonusById}?id=${req.query.questionid}`;
        
        // Add logging to debug the response
        console.log('Fetching bonus:', bonusByIdURL);
        
        request(bonusByIdURL, (error, response, body) => {
            if (error) {
                console.error('Bonus fetch error:', error);
                return res.status(500).send(error);
            }

            console.log('Bonus API response:', body);

            // Handle "Invalid Bonus ID" response
            if (body === "Invalid Bonus ID") {
                return res.status(500).send({ error: "Invalid Bonus ID" });
            }

            try {
                const bonusById = JSON.parse(body);
                
                // Check if the response has the expected structure
                if (!bonusById || !bonusById.bonus.leadin || !bonusById.bonus.parts || !bonusById.bonus.answers) {
                    console.error('Invalid bonus structure:', bonusById);
                    return res.status(500).send({ error: "Invalid response format from bonus-by-id API" });
                }
    
                // Get answer from the correct path in the response
                const bonusAnswer = bonusById.bonus.answers[parseInt(req.query.bonusPart)];
                if (!bonusAnswer) {
                    console.error('Invalid bonus part:', req.query.bonusPart);
                    return res.status(500).send({ error: "Invalid bonus part" });
                }

                const guess = encodeURIComponent(req.query.guess);
                const directiveResponseURL = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.checkAnswer}?answerline=${encodeURIComponent(bonusAnswer)}&givenAnswer=${guess}`;
                
                console.log('Checking answer:', directiveResponseURL);

                request(directiveResponseURL, (error, response, body) => {
                    if (error) {
                        console.error('Answer check error:', error);
                        return res.status(500).send(error);
                    }
    
                    if (response.statusCode >= 300) {
                        console.error('Answer check bad status:', response.statusCode, body);
                        return res.status(response.statusCode).send(body);
                    }
    
                    try {
                        const directiveResponse = JSON.parse(body);
                        res.json(directiveResponse);
                    } catch (e) {
                        console.error('Failed to parse check-answer response:', e);
                        res.status(500).send({ error: "Failed to parse check-answer API response" });
                    }
                });
            } catch (e) {
                console.error('Failed to parse bonus response:', e);
                res.status(500).send({ error: "Failed to parse bonus-by-id API response" });
            }
        });
    }
    else {
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
    }
});

app.listen(3000, () => {
    console.log('Proxy server running on http://localhost:3000');
});

module.exports = app;
