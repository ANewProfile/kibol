const request = require('supertest');
const express = require('express');
const nock = require('nock');

// Import the Express app
const app = require('./proxy.js');

describe('Proxy Server Tests', () => {
  beforeEach(() => {
    // Clear all nock interceptors
    nock.cleanAll();
  });

  afterAll(() => {
    // Ensure all nock interceptors are removed
    nock.restore();
  });

  describe('GET /tossup', () => {
    it('should successfully proxy a tossup request', async () => {
      const mockTossup = {
        tossups: [{
          id: "123",
          question: "This is a test question",
          answer: "Test Answer",
          tournament: "Test Tournament",
          category: "Test Category"
        }]
      };

      // Mock the QBReader API response
      nock('https://qbreader.org')
        .get('/api/random-tossup')
        .query({
          difficulties: '1,2,3,4,5,6',
          minYear: '2010',
          maxYear: '2024',
          powermarkOnly: 'true',
          standardOnly: 'true'
        })
        .reply(200, mockTossup);

      const response = await request(app)
        .get('/tossup')
        .expect(200);

      expect(response.body).toEqual(mockTossup);
    });

    it('should handle QBReader API errors', async () => {
      nock('https://qbreader.org')
        .get('/api/random-tossup')
        .query(true)
        .reply(500, { error: 'Internal Server Error' });

      await request(app)
        .get('/tossup')
        .expect(500);
    });
  });

  describe('GET /checkanswer', () => {
    it('should successfully check an answer', async () => {
      const questionId = '123';
      const guess = 'test answer';
      
      const mockTossup = {
        tossup: {
          id: questionId,
          answer: "Test Answer"
        }
      };

      const mockDirective = {
        directive: "accept",
        directedPrompt: null
      };

      // Mock the tossup-by-id request
      nock('https://qbreader.org')
        .get('/api/tossup-by-id')
        .query({ id: questionId })
        .reply(200, mockTossup);

      // Mock the check-answer request
      nock('https://qbreader.org')
        .get('/api/check-answer')
        .query(true)
        .reply(200, mockDirective);

      const response = await request(app)
        .get('/checkanswer')
        .query({
          questionid: questionId,
          guess: guess
        })
        .expect(200);

      expect(response.body).toEqual(mockDirective);
    });

    it('should handle invalid question IDs', async () => {
      const invalidQuestionId = 'invalid123';
      
      // Mock the tossup-by-id request for invalid ID
      nock('https://qbreader.org')
        .get('/api/tossup-by-id')
        .query({ id: invalidQuestionId })
        .reply(200, "Invalid Tossup ID");

      const response = await request(app)
        .get('/checkanswer')
        .query({
          questionid: invalidQuestionId,
          guess: 'test'
        })
        .expect(500); // Should return 500 when question not found

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid Tossup ID');
    });

    it('should handle missing query parameters', async () => {
      await request(app)
        .get('/checkanswer')
        .expect(400); // Changed from 500 to 400 for Bad Request
    });

    it('should handle tossup-by-id API errors', async () => {
      nock('https://qbreader.org')
        .get('/api/tossup-by-id')
        .query(true)
        .reply(500, { error: 'Internal Server Error' });

      await request(app)
        .get('/checkanswer')
        .query({
          questionid: '123',
          guess: 'test'
        })
        .expect(500);
    });

    it('should handle check-answer API errors', async () => {
      const mockTossup = {
        tossup: {
          id: '123',
          answer: "Test Answer"
        }
      };

      // Mock the tossup-by-id request to succeed
      nock('https://qbreader.org')
        .get('/api/tossup-by-id')
        .query(true)
        .reply(200, mockTossup);

      // Mock the check-answer request to fail
      nock('https://qbreader.org')
        .get('/api/check-answer')
        .query(true)
        .reply(500, { error: 'Internal Server Error' });

      await request(app)
        .get('/checkanswer')
        .query({
          questionid: '123',
          guess: 'test'
        })
        .expect(500);
    });
  });
});
