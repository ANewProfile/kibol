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
    console.log(`req.query: ${req.query.questionid}, ${req.query.guess}`);
    const tossupByIdURL = 'https://qbreader.org/api/tossup-by-id?id=' + req.query.questionid;
    console.log(`tossupByIdURL: ${tossupByIdURL}`);

    request(tossupByIdURL, (error, response, body) => {
        if (error) {
            return res.status(500).send(error);
        }

        const tossupById = JSON.parse(body);
        console.log(`tossupById: ${JSON.stringify(tossupById)}`);
        const tossupAnswer = tossupById["tossup"]["answer"];
        console.log(`tossupAnswer: ${tossupAnswer}`);
        const guess = req.query.guess;

        const directiveResponseURL = 'https://qbreader.org/api/check-answer?answerline=' + tossupAnswer + '&givenAnswer=' + guess;

        request(directiveResponseURL, (error, response, body) => {
            if (error) {
                return res.status(500).send(error);
            }

            const directiveResponse = JSON.parse(body);
            res.json(directiveResponse);
        });
    });
});

app.listen(3000, () => {
    console.log('Proxy server running on http://localhost:3000');
});