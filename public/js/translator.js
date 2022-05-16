const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

var key = "85f608a71b654ef8bbdef5dbaaa0c416";
var endpoint = "https://api.cognitive.microsofttranslator.com";

// Add your location, also known as region. The default is global.
// This is required if using a Cognitive Services resource.
var location = "southeastasia";

exports.translateText = function(text){
     return axios({
        baseURL: endpoint,
        url: '/translate',
        method: 'post',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Ocp-Apim-Subscription-Region': location,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuidv4().toString()
        },
        params: {
            'api-version': '3.0',
            'from': 'en',
            'to': 'fil'
        },
        data: [{
            'text': text
        }],
        responseType: 'json'
    });
}


exports.localTranslate = function(text){
    switch (text.toLowerCase()) {
        case "light rain" : return "mahinang ulan";
        case "medium rain" : return "katamtamang ulan";
        case "clear" : return "walang ulan";
        case "heavy rain" : return "malakas na ulan";
        default :
    }
}