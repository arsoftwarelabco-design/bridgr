// ═══ FILE: server.js ═══
const express = require('express');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Get IAM token from IBM
async function getIAMToken() {
  const apiKey = process.env.WATSONX_API_KEY;
  
  if (!apiKey) {
    throw new Error('WATSONX_API_KEY not found in .env file');
  }

  const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`
  });

  if (!response.ok) {
    throw new Error(`Failed to get IAM token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// POST /api/analyze endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { repoUrl, readmeContent, repoMeta } = req.body;

    // Get IAM token
    const accessToken = await getIAMToken();

    // Build prompt
    const prompt = `You are a business analyst. Analyze this software project and respond with ONLY a JSON object.

CRITICAL: Your response must be ONLY the JSON object below. No explanations, no markdown, no backticks, no extra text before or after.

Repository: ${repoMeta.name || 'Unknown'}
Description: ${repoMeta.description || 'No description'}
Stars: ${repoMeta.stargazers_count || 0}
Language: ${repoMeta.language || 'Unknown'}
README (first 2000 chars): ${readmeContent.substring(0, 2000)}

Return this exact JSON structure with your analysis:
{
  "projectName": "short friendly name max 4 words",
  "whatItDoes": "3 sentences plain English, zero tech terms",
  "businessValue": ["benefit 1", "benefit 2", "benefit 3"],
  "timeline": [
    {"phase": "Setup & Review", "weeks": "Week 1-2"},
    {"phase": "Customization", "weeks": "Week 3-5"},
    {"phase": "Launch & Training", "weeks": "Week 6-8"}
  ],
  "investment": [
    {"label": "Development", "percent": 45, "color": "#0f62fe"},
    {"label": "Design", "percent": 25, "color": "#7c3aed"},
    {"label": "Testing", "percent": 20, "color": "#0891b2"},
    {"label": "Training", "percent": 10, "color": "#059669"}
  ],
  "clarityScore": 94,
  "industries": ["Industry 1", "Industry 2", "Industry 3"],
  "radarScores": {
    "complexity": 5,
    "cost": 6,
    "time": 4,
    "risk": 3,
    "roi": 8
  },
  "risks": [
    "Risk 1 in plain business language",
    "Risk 2 in plain business language",
    "Risk 3 in plain business language"
  ],
  "competitiveEdge": "One punchy sentence about competitive advantage of adopting this solution"
}`;

    // Call watsonx
    const watsonxUrl = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
    const projectId = process.env.WATSONX_PROJECT_ID;

    if (!projectId) {
      throw new Error('WATSONX_PROJECT_ID not found in .env file');
    }

    const watsonxResponse = await fetch(
      `${watsonxUrl}/ml/v1/text/generation?version=2023-05-29`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model_id: 'ibm/granite-4-h-small',
          project_id: projectId,
          parameters: {
            max_new_tokens: 1800,
            temperature: 0.3,
            stop_sequences: ['```']
          },
          input: prompt
        })
      }
    );

    if (!watsonxResponse.ok) {
      const errorText = await watsonxResponse.text();
      throw new Error(`Watsonx API error: ${watsonxResponse.statusText} - ${errorText}`);
    }

    const watsonxData = await watsonxResponse.json();
    let generatedText = watsonxData.results[0].generated_text;

    console.log('Raw AI response:', generatedText);

    // Clean the response - remove any markdown backticks and extra text
    generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to extract JSON if there's extra text
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      generatedText = jsonMatch[0];
    }

    console.log('Cleaned response:', generatedText);

    // Parse JSON
    let parsedReport;
    try {
      parsedReport = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('Failed to parse JSON. Error:', parseError.message);
      console.error('Attempted to parse:', generatedText.substring(0, 500));
      
      // Return a fallback report if parsing fails
      parsedReport = {
        projectName: repoMeta.name || 'Software Project',
        whatItDoes: repoMeta.description || 'This is a software project that needs analysis.',
        businessValue: [
          'Provides software functionality',
          'Can be customized for business needs',
          'Open source and community supported'
        ],
        timeline: [
          {phase: 'Setup & Review', weeks: 'Week 1-2'},
          {phase: 'Customization', weeks: 'Week 3-5'},
          {phase: 'Launch & Training', weeks: 'Week 6-8'}
        ],
        investment: [
          {label: 'Development', percent: 45, color: '#0f62fe'},
          {label: 'Design', percent: 25, color: '#7c3aed'},
          {label: 'Testing', percent: 20, color: '#0891b2'},
          {label: 'Training', percent: 10, color: '#059669'}
        ],
        clarityScore: 85,
        industries: ['Technology', 'Software', 'Digital Services'],
        radarScores: {
          complexity: 5,
          cost: 6,
          time: 5,
          risk: 4,
          roi: 7
        },
        risks: [
          'Implementation complexity may require specialized expertise',
          'Integration with existing systems needs careful planning',
          'Training and adoption timeline should be considered'
        ],
        competitiveEdge: 'Adopting this solution can modernize operations and improve efficiency'
      };
      console.log('Using fallback report due to parsing error');
    }

    res.json({ success: true, report: parsedReport });

  } catch (error) {
    console.error('Error in /api/analyze:', error);
    res.json({ success: false, error: error.message });
  }
});

// POST /api/chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, repoContext } = req.body;

    // Get fresh IAM token
    const accessToken = await getIAMToken();

    // Build simplified chat prompt
    const contextStr = repoContext ? repoContext.substring(0, 300) : '';
    const prompt = `You are Bridgr, a friendly business analyst assistant.
Answer in plain business language only. No technical jargon.
Be helpful, concise, and practical (2-4 sentences max).
${contextStr ? 'Project context: ' + contextStr : ''}
User: ${message}
Bridgr:`;

    // Call watsonx
    const watsonxUrl = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
    const projectId = process.env.WATSONX_PROJECT_ID;

    if (!projectId) {
      throw new Error('WATSONX_PROJECT_ID not found in .env file');
    }

    const watsonxResponse = await fetch(
      `${watsonxUrl}/ml/v1/text/generation?version=2023-05-29`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model_id: 'ibm/granite-4-h-small',
          project_id: projectId,
          parameters: {
            max_new_tokens: 300,
            temperature: 0.3
          },
          input: prompt
        })
      }
    );

    if (!watsonxResponse.ok) {
      const errorText = await watsonxResponse.text();
      console.error('Watsonx API error:', watsonxResponse.statusText, errorText);
      throw new Error(`Watsonx API error: ${watsonxResponse.statusText} - ${errorText}`);
    }

    const watsonxData = await watsonxResponse.json();
    console.log('Raw watsonx response:', JSON.stringify(watsonxData, null, 2));
    
    // Extract and trim the generated text
    const reply = watsonxData.results[0].generated_text.trim();
    console.log('Extracted reply:', reply);

    res.json({ success: true, reply });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.json({ success: false, error: error.message });
  }
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Bridgr running at http://localhost:${PORT}`);
});

// Made with Bob
