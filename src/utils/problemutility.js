const axios = require('axios');

const getlanguagebyid = (lang) =>{
    const languagemap = {
        "c++" : 54,
        "cpp" : 54,
        "java" : 62,
        "javascript" : 63,
    }

    return languagemap[lang.toLowerCase()];
}

const submitbatch =async (submissions) =>{
const options = {
  method: 'POST',
  url: 'https://judge0-ce.p.rapidapi.com/submissions/batch',
  params: {
    base64_encoded: 'true',
  },
  headers: {
    'x-rapidapi-key': "dcfa5b0095msh95d5895f5b2f4f4p147d15jsn16864994426b",
    'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
    'Content-Type': 'application/json'
  },
  data: {
    submissions
  }
};

async function fetchData() {
	try {
		const response = await axios.request(options);
		return response.data;
	} catch (error) {
		console.error("Submit Batch Error:", error.response?.data || error.message);
        return [];
	}
}

return await fetchData();
}
// 'dce7bbc5-a8c9-4159-a28f-ac264e48c371,1ed737ca-ee34-454d-a06f-bbc73836473e,9670af73-519f-4136-869c-340086d406db'

// const waiting = async(timer)=>{
//   setTimeout(()=>{
//     return 1;
//   }, timer);
// }

const waiting = (timer) => new Promise(resolve => setTimeout(resolve, timer));
const submittoken = async (tokens)=>{
  const tokenList = Array.isArray(tokens) 
        ? tokens.map(t => (typeof t === 'object' ? t.token : t)).join(',') 
        : tokens;

        console.log("🔍 Final Token List for Polling:", tokenList); 
const options = {
  method: 'GET',
  url: 'https://judge0-ce.p.rapidapi.com/submissions/batch',
  params: {
    tokens: tokenList,
    base64_encoded: 'true',
    fields: '*'
  },
  headers: {
    'x-rapidapi-key': 'dcfa5b0095msh95d5895f5b2f4f4p147d15jsn16864994426b',
    'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
    'Content-Type': 'application/json'
  }
};

async function fetchData() {
	try {
		const response = await axios.request(options);
		return  response.data;
	} catch (error) {
		console.error(error);
	}
}

while(true){
  try {
    console.log("🔍 Polling Judge0 for results...");
    const response = await axios.request(options);
    const result = response.data;

    // Check if result and result.submissions exist before mapping
    if (result && result.submissions) {
        const isresultobtain = result.submissions.every((r) => r.status_id > 2);
        if (isresultobtain) {
            return result.submissions;
        }
    }else if (Array.isArray(result)) { 
      // Kuch versions mein direct array aata hai
      const isresultobtain = result.every((r) => r.status_id > 2);
      if (isresultobtain) return result;
  }
} catch (error) {
  console.error("Polling Error Details:", error.response?.data || error.message);
}

await waiting(2000);
}
}

module.exports = {getlanguagebyid , submitbatch , submittoken};