async function fetchAllByKey(fieldKey = 'pageid') {
    const results = [];
    let continueParam = null;
    // Build URL with continue parameter if needed
    // incategory:"Lingua Libre pronunciation with incomplete parameters" -haswbstatement:P585 -haswbstatement:P10135
    // let apiUrl = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&formatversion=2&srsearch=incategory:"Lingua_Libre_pronunciation_with_incomplete_parameters"_-haswbstatement:P585_-haswbstatement:P10135&srnamespace=6&srlimit=max';
    // incategory:"Lingua Libre pronunciation with incomplete parameters" haswbstatement:P585
    let apiUrl = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&formatversion=2&srsearch=incategory:"Lingua_Libre_pronunciation_with_incomplete_parameters"&srnamespace=6&srlimit=max';
    console.log(`Fetching list of targets from: ${apiUrl}`);
    do {
        if (continueParam) {
            apiUrl += `&sroffset=${continueParam.sroffset}&continue=${encodeURIComponent(continueParam.continue)}`;
        }        
        try {
            // Fetch data from API
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            // Extract specified field from search results
            if (data.query && data.query.search) {
                const pageData = data.query.search.map(item => item[fieldKey]);
                results.push(...pageData);
                console.log(`Fetched ${pageData.length} ${fieldKey}s.`);
            }
            
            // Check if there are more results to fetch
            continueParam = data.continue || null;
            
        } catch (error) {
            console.error('Error fetching data:', error);
            break;
        }
        
    } while (continueParam);
    console.log(`Total ${results.length} ${fieldKey}s.`);
    console.log(`Data: [${results.join(', ')}]`);
    return results;
}

// Export the function
export default fetchAllByKey;

/*

// Example output:
{
    "batchcomplete": true,
    "continue": {
        "sroffset": 500,
        "continue": "-||"
    },
    "limits": {
        "search": 500
    },
    "query": {
        "searchinfo": {
            "totalhits": 704
        },
        "search": [
            {
                "ns": 6,
                "title": "File:LL-Q27683 (ace)-Muislate-aneuk mata.wav",
                "pageid": 177668440,
                "size": 198,
                "wordcount": 138,
                "snippet": "== Summary == == Licensing == This file is licensed under the Creative Commons Attribution-Share Alike 4.0 International license. You are free: to share",
                "timestamp": "2025-11-01T13:57:19Z"
            },
            {  ...  }
        ]
    }
}
*/