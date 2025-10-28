# Simple Maths CAPTCHA

[![npm](https://img.shields.io/npm/v/@codebundlesbyvik/simple-maths-captcha)](https://www.npmjs.com/package/@codebundlesbyvik/simple-maths-captcha)
[![npm - downloads per week](https://img.shields.io/npm/dw/@codebundlesbyvik/simple-maths-captcha)](https://www.npmjs.com/package/@codebundlesbyvik/simple-maths-captcha)

Easy to use, easy to solve CAPTCHA.

![simple-maths-captcha](https://github.com/user-attachments/assets/b954f9ae-1164-4875-8307-527673a2fd7c)

<br>

## Table of Contents

1. [Usage](#usage)
2. [Browser support](#browser-support)
3. [Instance options](#instance-options)
4. [Methods](#methods)
    * [`.activate()`](#activate)
    * [`.deactivate()`](#deactivate)
5. [Upgrading from 1.x.x](#upgrading-from-1xx)
6. [License](#license)

<br>

## Usage

``` shell
# Install packages from npm
npm install @codebundlesbyvik/ntp-sync @codebundlesbyvik/simple-maths-captcha
```

If you're not using a module bundler then:
* Download the latest `@codebundlesbyvik/js-helpers` release [from GitHub](https://github.com/vikputthiscodeongit/js-helpers/releases/latest) or load it directly [via jsdelivr](https://cdn.jsdelivr.net/npm/@codebundlesbyvik/js-helpers@2.1.5/dist/index.js).
* Download the latest `@codebundlesbyvik/ntp-sync` release [from GitHub](https://github.com/vikputthiscodeongit/ntp-sync/releases/latest) or load it directly [via jsdelivr](https://cdn.jsdelivr.net/npm/@codebundlesbyvik/ntp-sync@1.1.1/dist/index.js).
* Download the latest `@codebundlesbyvik/simple-maths-captcha` release [from GitHub](https://github.com/vikputthiscodeongit/simple-maths-captcha/releases/latest) or load it directly [via jsdelivr](https://cdn.jsdelivr.net/npm/@codebundlesbyvik/simple-maths-captcha@2.0.0/dist/index.js).

For the example below I assume the main JavaScript file is processed by a module bundler.

``` javascript
import Ntp, { convertUnixTimeFormatToMs } from "@codebundlesbyvik/ntp-sync";
import SimpleMathsCaptcha from "@codebundlesbyvik/simple-maths-captcha";

const ntp = new Ntp({
    t1EndpointUrl: "./api/ntp/get-server-time.php",
    t1CalcFn: async function (response: Response) {
        const fetchedData = (await response.json()) as unknown;

        const isValidData = (data: unknown): data is { req_received_time: number } =>
            typeof data === "object" && data !== null && "req_received_time" in data;

        return isValidData(fetchedData)
            ? convertUnixTimeFormatToMs(fetchedData.req_received_time)
            : null;
    },
    t2CalcFn: function (responseHeaders: Headers) {
        const header = responseHeaders.get("Response-Timing");

        if (!header) return null;

        const reqReceivedTime = /\bt=([0-9]+)\b/.exec(header);
        const reqProcessingTime = /\bD=([0-9]+)\b/.exec(header);

        if (!reqReceivedTime || !reqProcessingTime) return null;

        const respTransmitTime =
            Number.parseInt(reqReceivedTime[1]) + Number.parseInt(reqProcessingTime[1]);

        return convertUnixTimeFormatToMs(respTransmitTime);
    },
});
const captcha = new SimpleMathsCaptcha({
    activatorButtonEl: document.querySelector("#simple-maths-captcha-activator-button"),
    dataEndpointUrl: "./api/simple-maths-captcha/generate-problem.php",
    dataHandlerFn: async function (response: Response) {
        const fetchedData = (await response.json()) as unknown;

        const isProblemData = (data: unknown): data is [number, number, number] =>
            Array.isArray(data) &&
            data.length === 3 &&
            data.every((item) => typeof item === "number");

        return isProblemData(fetchedData) ? fetchedData : null;
    },
    ntp,
});
```

The CAPTCHA initializes on instance creation. On press of the activator button a NTP sync is performed after which a maths problem is requested. The problem is inserted in the DOM, alongside 3 `<input>`s: the main one in which the user has to provide the answer and 2 hidden ones used to store the problem's individual digits. The CAPTCHA is automatically deactivated after the invalidation time provided by the back end has passed.

The exact implementation of the back end component is up to you. If you need some inspiration you can check out [how I did it in PHP for my own website](https://github.com/vikputthiscodeongit/viktor-web/tree/main/php/controllers/simple-maths-captcha).

<br>

## Browser support

Requires an ECMAScript 2022 (ES13) compatible browser. Practically speaking, all browsers released in 2021 and onwards are fully supported.

<br>

## Instance options

| Property                                                           | Type                                                                                                                                                                                     | Default                  | Description                                                                                                                                                                                                                                                |
| :------------------------------------------------------------------| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activatorButtonEl`<br> **Required**                               | `HTMLButtonElement` \| `HTMLInputElement`                                                                                                                                                | -                        | Button which the user presses to activate the CAPTCHA. Must be a child of the `<form>`.                                                                                                                                                                    |
| `id`                                                               | `string`                                                                                                                                                                                 | `"simple-maths-captcha"` | Set as HTML `id` & `name` on the `<input>`s generated by the instance, after automatic addition of the `<input>`'s role.<br> E.g. `id: "contact-form-captcha"` results in `contact-form-captcha-answer` added as HTML `id` & `name` to the main `<input>`. |
| `ntp`<br> **Required**                                             | [@codebundlesbyvik/ntp-sync](https://github.com/vikputthiscodeongit/ntp-sync?tab=readme-ov-file) instance                                                                                | -                        | `@codebundlesbyvik/ntp-sync` instance used for NTP sync before problem generation.                                                                                                                                                                         |
| `dataEndpointUrl`<br> **Required if `dataEndpoint` not provided.** | `string`                                                                                                                                                                                 | -                        | URL of the endpoint to retrieve the problem data from.                                                                                                                                                                                                     |
| `dataEndpoint`<br> **Required if `dataEndpointUrl` not provided.** | [@codebundlesbyvik/js-helpers `fetchWithTimeout` parameters](https://github.com/vikputthiscodeongit/js-helpers?tab=readme-ov-file#fetchwithtimeoutresource-fetchoptions-timeoutduration) | -                        | Parameters for the fetcher used to retrieve the problem data.                                                                                                                                                                                              |
| `dataHandlerFn`                                                    | `(response: Response) => Promise<[number, number, number] \| null>`                                                                                                                      | `undefined`              | Function used to process problem data. Must return an **array** of which the **first 2 items** are the **maths problem digits** and the **final item** is **Unix timestamp in milliseconds after which the problem is invalidated**.                       |                                                                                                                                                                                                                 |
| `answerInputElClass`                                               | `string`                                                                                                                                                                                 | `undefined`              | HTML `class` to add to the main `<input>`.                                                                                                                                                                                                                 |
| `answerInputElEventHandlers`                                       | [`addEventListener()` parameters](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#parameters)                                                              | `undefined`              | Event handlers to add to the main `<input>`.                                                                                                                                                                                                               |
| `labelElLoadingText`                                               | `string`                                                                                                                                                                                 | `"Loading CAPTCHA"`      | Text shown as `<label>` content when loading.                                                                                                                                                                                                              |
| `loaderEl`                                                         | `HTMLElement`                                                                                                                                                                            | `undefined`              | Element to add after the `<label>` when loading.                                                                                                                                                                                                           |

<br>

## Methods

### `.activate()`

Performs NTP sync, requests a new maths problem, inserts it and the 3 `<input>`s in the DOM and schedules `.deactivate()`.

### `.deactivate()`

Removes the `<input>`s from the DOM and inserts the activator button. Automatically called after invalidation time has passed.

<br>

## Upgrading from 1.x.x

The following changes are breaking:
* **Added:** `dataHandlerFn` for processing problem data endpoint response.
* **Removed:** Expiry timer element.
* **Renamed:** `generatorEndpoint` > `dataEndpoint`
* **Renamed:** `labelElLoadingTextContent` > `labelElLoadingText`
* **Changed:** Renamed `baseId` to `id` as it's now used as ID instead of as a prefix for `simple-maths-captcha`.
* **Changed:** Require NTP instance instead of NTP instance options.
* **Changed:** Undocumented but public class field visibility & mutability.

<br>

## License

Mozilla Public License 2.0 © 2025 [Viktor Chin-Kon-Sung](https://github.com/vikputthiscodeongit)
