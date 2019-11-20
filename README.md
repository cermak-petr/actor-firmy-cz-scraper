### Firmy.cz Scraper

Firmy.cz Scraper is an [Apify actor](https://apify.com/actors) for extracting data about companies from [Firmy.cz](https://www.firmy.cz). It allows you to search for any category of companies and extract detailed information about each one. It is build on top of [Apify SDK](https://sdk.apify.com/) and you can run it both on [Apify platform](https://my.apify.com) and locally.

- [Input](#input)
- [Output](#output)
- [Compute units consumption](#compute-units-consumption)
- [Extend output function](#extend-output-function)

### Input

| Field | Type | Description | Default value
| ----- | ---- | ----------- | -------------|
| startUrls | array | List of [Request](https://sdk.apify.com/docs/api/request#docsNav) objects that will be deeply crawled. The URL can be top level like `https://www.firmy.cz`, any category URL or company detail URL | `[{ "url": "https://www.firmy.cz" }]`|
| maxItems | number | Maximum number of actor pages that will be scraped | all found |
| extendOutputFunction | string | Function that takes a JQuery handle ($) as argument and returns data that will be merged with the default output. More information in [Extend output function](#extend-output-function) | |
| proxyConfiguration | object | Proxy settings of the run. If you have access to Apify proxy, leave the default settings. If not, you can set `{ "useApifyProxy": false" }` to disable proxy usage | `{ "useApifyProxy": true }`|

### Output

Output is stored in a dataset. Each item is information about a company. Example:

```
{
    "title": "ClaimCloud.cz",
    "address": "Revoluční 1403/28, 11000 Praha, Nové Město",
    "latitude": 50.092247009277344,
    "longitude": 14.427606582641602,
    "description": "Firma byla založena za účelem pomáhat cestujícím v letecké dopravě v získávání finančních kompenzací u leteckých společností, a to v oblastech zpoždění letů, zrušení letů, zmeškání návazných letů, odepření nástupu na palubu, snížení přepravní třídy nebo v případě problémů se zavazadly.",
    "categories": [
        "Cestovní služby"
    ],
    "rating": null,
    "ratingcount": 0,
    "phone": "+420 777 993 788",
    "emails": [
        "info@claimcloud.cz",
        "support@claimcloud.cz"
    ],
    "website": "claimcloud.cz",
    "url": "https://www.firmy.cz/detail/12998843-claimcloud-cz-praha-nove-mesto.html"
}
```

### Compute units consumption
Keep in mind that it is much more efficient to run one longer scrape (at least one minute) than more shorter ones because of the startup time.

The average consumption is **1 Compute unit for 1000 actor pages** scraped

### Extend output function

You can use this function to update the default output of this actor. This function gets a JQuery handle `$` as an argument so you can choose what data from the page you want to scrape. The output from this will function will get merged with the default output.

The return value of this function has to be an object!

You can return fields to achive 3 different things:
- Add a new field - Return object with a field that is not in the default output
- Change a field - Return an existing field with a new value
- Remove a field - Return an existing field with a value `undefined`


```
($) => {
    return {
        image: $('.photoMain').attr('src'),
        title: 'the-new-title',
        rating: undefined,
    }
}
```
This example will add a new field `image`, change the `title` field and remove the `rating` field
```
{
    "title": "the-new-title",
    "address": "Revoluční 1403/28, 11000 Praha, Nové Město",
    "latitude": 50.092247009277344,
    "longitude": 14.427606582641602,
    "description": "Firma byla založena za účelem pomáhat cestujícím v letecké dopravě v získávání finančních kompenzací u leteckých společností, a to v oblastech zpoždění letů, zrušení letů, zmeškání návazných letů, odepření nástupu na palubu, snížení přepravní třídy nebo v případě problémů se zavazadly.",
    "categories": [
        "Cestovní služby"
    ],
    "ratingcount": 0,
    "phone": "+420 777 993 788",
    "emails": [
        "info@claimcloud.cz",
        "support@claimcloud.cz"
    ],
    "website": "claimcloud.cz",
    "url": "https://www.firmy.cz/detail/12998843-claimcloud-cz-praha-nove-mesto.html",
    "image": "https://d48-a.sdn.cz/d_48/c_img_E_G/wBmPnX.png?fl=res,600,400,3,ffffff"
}
```

### Epilogue
Thank you for trying my actor. I will be very glad for a feedback that you can send to my email `petr.cermak@apify.com`. If you find any bug, please create an issue on the [Github page](https://github.com/cermak-petr/actor-firmy-cz-scraper).