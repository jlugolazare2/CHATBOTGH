require('dotenv').config();
//const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

//dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async function chat(prompt, text) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const formaprompt = 'Eres un asistente vistual. al final te voy a dar un input que envio el usuario. \n\n' + prompt + 'el input del usuario es el sigueinte'+text;
    const result = await model.generateContent(formaprompt);
    const response=result.response;
    const answ=response.text();
    
    console.log(result.response.text());
}





