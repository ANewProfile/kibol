const express = require('express');
const request = require('request');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/tossup', (req, res) => {
    const url = 'https://qbreader.org/api/random-tossup?difficulties=1,2,3,4,5,6&minYear=2010&maxYear=2024&powermarkOnly=true&standardOnly=true';
    req.pipe(request(url)).pipe(res);
});

app.get('/checkanswer', (req, res) => {
    const tossupByIdURL = 'https://qbreader.org/api/tossup-by-id?id=' + req.query.questionid;

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

            const directiveResponseURL = 'https://qbreader.org/api/check-answer?answerline=' + encodeURIComponent(tossupAnswer) + '&givenAnswer=' + guess;

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
