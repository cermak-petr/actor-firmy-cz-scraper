// This is the main Node.js source code file of your actor.
// It is referenced from the "scripts" section of the package.json file,
// so that it can be started by running "npm start".

// Include Apify SDK. For more information, see https://sdk.apify.com/
const Apify = require('apify');

const isObject = (val) => typeof val === 'object' && val !== null && !Array.isArray(val);

const extractData = () => {
    const $ = selector => document.querySelector(selector);
    const $$ = selector => Array.from(document.querySelectorAll(selector));
    const title = $('[itemprop="name"]').textContent.trim();
    const address = $('[itemprop="address"]').textContent.trim();
    const lat = $('[itemprop="latitude"]').getAttribute('content');
    const lon = $('[itemprop="longitude"]').getAttribute('content');
    const desc = $('[itemprop="description"]').textContent.trim();
    const categories = $$('.category').map(c => c.textContent.trim());
    const rating = $('[itemprop="ratingValue"]').getAttribute('content');
    const rCount = $('[itemprop="ratingCount"]').textContent.trim();
    const ratingCount = rCount ? parseInt(rCount) : 0;
    const phone = $('[itemprop="telephone"]').textContent.trim();
    const emails = $$('.companyMail').map(e => e.textContent.trim());
    const websites = $$('.companyUrl').map(e => e.textContent.trim());
    const result = {
        "title": title,
        "address": address.replace(/[\n\t]+/g, ''),
        "latitude": lat ? parseFloat(lat) : null,
        "longitude": lon ? parseFloat(lon) : null,
        "description": desc,
        "categories": categories,
        "rating": (ratingCount && rating) ? parseInt(rating)/20 : null,
        "ratingcount": ratingCount,
        "phone": phone,
        "emails": emails,
        "website": websites[0] || null
    };
    return result;
};

Apify.main(async () => {
    // Get input of the actor.
    const input = await Apify.getInput();

    // Open default dataset
    const dataset = await Apify.openDataset();
    let itemCount = (await dataset.getInfo()).cleanItemCount;

    let extendOutputFunction;
    try {
        extendOutputFunction = eval(input.extendOutputFunction);
    } catch (e) {
        throw new Error(`extendOutputFunction is not a valid JavaScript! Error: ${e}`)
    }
    if (typeof extendOutputFunction !== "function") {
        throw new Error(`extendOutputFunction is not a function! Please fix it or use just default output!`)
    }

    // Open a request queue and request list
    let requestList = null;
    const requestQueue = await Apify.openRequestQueue();
    if(input.startURLs){
        requestList = new Apify.RequestList({ sources: input.startURLs });
        await requestList.initialize();  
    }
    else{await requestQueue.addRequest({ url: 'https://www.firmy.cz/' });}

    // Define a pattern of URLs that the crawler should visit
    const pageSelector = 'a.imgLink, a.companyTitle, a.btnExtendPage';
    const pseudoUrls = [new Apify.PseudoUrl('https://www.firmy.cz/[.+]')];

    // Create a crawler that will use headless Chrome / Puppeteer to extract data
    // from pages and recursively add links to newly-found pages
    const crawler = new Apify.PuppeteerCrawler({
        requestList,
        requestQueue,

        launchPuppeteerOptions: input.proxyConfiguration || {
            useApifyProxy: true
        },

        // This function is called for every page the crawler visits
        handlePageFunction: async ({ request, page }) => {
            if(request.url.includes('/detail/')){                
                try{await page.waitFor('[itemprop="ratingCount"]');}
                catch(e){console.log('No rating count found.');}
                await Apify.utils.puppeteer.injectJQuery(page);
                const myResult = await page.evaluate(extractData);
                myResult.url = request.url;

                let userResult = {};
                try {
                    await page.evaluate(`window.eoFn = ${input.extendOutputFunction};`);
                    userResult = await page.evaluate(async () => 
                        JSON.stringify(await eoFn($), (k, v) => v === undefined ? 'to_be_deleted' : v)
                    );
                    userResult = JSON.parse(userResult);
                    Object.keys(userResult).map(function(key, index) {
                        if(userResult[key] === 'to_be_deleted'){
                            userResult[key] = undefined;
                        }
                    });
                } catch (e) {
                    console.log(`extendOutputFunction crashed! Pushing default output. Please fix your function if you want to update the output. Error: ${e}`);
                }

                if (!isObject(userResult)) {
                    console.log('extendOutputFunction has to return an object!');
                    process.exit(1);
                }
                const result = Object.assign(myResult, userResult);

                await dataset.pushData(result);
                if(input.maxItems && ++itemCount >= input.maxItems){
                    console.log('Maximum item count reached, finishing...');
                    process.exit(0);
                }
            }
            else{
                try{await page.waitFor(pageSelector);}
                catch(e){console.log('No sub-pages found.');}
                await Apify.utils.enqueueLinks({ 
                    page,
                    selector: pageSelector,
                    pseudoUrls,
                    requestQueue
                });
            }
        },

        // This function is called for every page the crawler failed to load
        // or for which the handlePageFunction() throws at least "maxRequestRetries"-times
        handleFailedRequestFunction: async ({ request }) => {
            console.log(`Request ${request.url} failed too many times`);
            await Apify.pushData({
                '#debug': Apify.utils.createRequestDebugInfo(request),
            });
        },
        
        gotoFunction: async function({ page, request, puppeteerPool }){
            try{
                //await page.setJavaScriptEnabled(false)
                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    if( req.resourceType() == 'stylesheet' || 
                        req.resourceType() == 'font' || 
                        req.resourceType() == 'image' || 
                        /*req.resourceType() === 'script'*/ ){
                        req.abort();
                    }
                    else{req.continue();}
                });
                return await Apify.utils.puppeteer.gotoExtended(page, request, { timeout: this.gotoTimeoutMillis });
            }
            catch(e){
                //await puppeteerPool.retire(page.browser());
                throw e.message;
            }
        },

        maxRequestRetries: 3
    });

    await crawler.run();
});