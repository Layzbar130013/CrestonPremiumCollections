// Vercel Serverless Function entrypoint
const handleRequest = require('../server');

module.exports = async (req, res) => {
  return handleRequest(req, res);
};
