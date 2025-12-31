// Background script for Gemini AI Sidebar

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GENERATE_CONTENT') {
        handleGenerateContent(request.payload, sendResponse);
        return true; // Will respond asynchronously
    } else if (request.action === 'SAVE_KEY') {
        chrome.storage.local.set({ geminiApiKey: request.key }, () => {
            sendResponse({ success: true });
        });
        return true;
    } else if (request.action === 'GET_KEY') {
        chrome.storage.local.get(['geminiApiKey'], (result) => {
            sendResponse({ key: result.geminiApiKey });
        });
        return true;
    }
});


async function handleGenerateContent(payload, sendResponse) {
    const { prompt, apiKey, systemPrompt, baseUrl, modelName } = payload;

    if (!apiKey) {
        sendResponse({ error: 'API Key not found' });
        return;
    }

    // Default values if not provided (fallback)
    const effectiveModel = modelName || 'gemini-1.5-flash';
    const rawBaseUrl = baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models/{currentmodel}:generateContent';

    // Construct the dynamic URL
    // Replace {currentmodel} with actual model name.
    let apiUrl = rawBaseUrl.replace('{currentmodel}', effectiveModel);

    // Check if key is already in URL (some custom proxies might have it), if not append it
    if (!apiUrl.includes('?key=') && !apiUrl.includes('&key=')) {
        const separator = apiUrl.includes('?') ? '&' : '?';
        apiUrl += `${separator}key=${apiKey}`;
    }

    const body = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }]
    };

    if (systemPrompt) {
        body.system_instruction = {
            parts: [{
                text: systemPrompt
            }]
        };
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });


        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

        sendResponse({ result: generatedText });

    } catch (error) {
        console.error('Gemini API Error:', error);
        sendResponse({ error: error.message });
    }
}
