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
    * [`.isCaptchaInputEl(id: string)`](#iscaptchainputelid-string)
    * [`.activate()`](#activate)
    * [`.deactivate()`](#deactivate)
5. [License](#license)

<br>

## Usage

``` shell
# Install packages from npm
npm install @codebundlesbyvik/simple-maths-captcha @codebundlesbyvik/ntp-sync
```

If you're not using a module bundler then either:

* [Download the latest release from the GitHub releases page](https://github.com/vikputthiscodeongit/simple-maths-captcha/releases/latest), or
* [Load the JavaScript](https://cdn.jsdelivr.net/npm/@codebundlesbyvik/simple-maths-captcha@1.1.0/dist/index.js) via the jsdelivr CDN.

For the example below I assume the main JavaScript file is processed by a module bundler.

``` javascript
import Ntp, { convertUnixTimeFormatToMs } from "@codebundlesbyvik/ntp-sync";
import SimpleMathsCaptcha from "@codebundlesbyvik/simple-maths-captcha";

const ntp = new Ntp({
    t1EndpointUrl: "./api/ntp/get-server-time.php",
    t1CalcFn: async function t1CalcFn(response: Response) {
        const data = (await response.json()) as { req_received_time: number };

        return convertUnixTimeFormatToMs(data.req_received_time);
    },
    t2CalcFn: function t2CalcFn(resHeaders: Headers) {
        const header = resHeaders.get("Response-Timing");

        if (!header) return null;

        const reqReceivedTime = /\bt=([0-9]+)\b/.exec(header);
        const reqProcessingTime = /\bD=([0-9]+)\b/.exec(header);

        if (!reqReceivedTime || !reqProcessingTime) return null;

        const resTransmitTime =
            Number.parseInt(reqReceivedTime[1]) + Number.parseInt(reqProcessingTime[1]);

        return convertUnixTimeFormatToMs(resTransmitTime);
    },
});
const captcha = new SimpleMathsCaptcha({
    activatorButtonEl: document.querySelector("#simple-maths-captcha-activator-button"),
    generatorEndpointUrl: "./api/simple-maths-captcha/generate-problem.php",
    ntp,
});
```

The CAPTCHA initializes on instance creation. On press of the activator button a NTP sync is performed after which a maths problem is requested. The problem is inserted in the DOM, alongside 3 `<input>`s: the main one in which the user has to provide the answer and 2 hidden ones used to store the problem's individual digits. The CAPTCHA is automatically deactivated after the invalidation time provided by the back end has passed.

The exact implementation of the back end components is up to you. If you need some inspiration you can check out [how I did it in PHP for my own website](https://github.com/vikputthiscodeongit/viktor-web/tree/main/php/controllers).

<br>

## Browser support

Requires an ECMAScript 2022 (ES13) compatible browser. Practically speaking, all browsers released in 2021 and onwards are fully supported.

<br>

## Instance options

| Property                                                                     | Type                                                                                                                                                                                     | Default                  | Description                                                                                                                                                                                                                                                                          |
| :--------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activatorButtonEl`<br> **Required**                                         | `HTMLButtonElement` \| `HTMLInputElement`                                                                                                                                                | -                        | Button which the user presses to activate the CAPTCHA. Must be a child of the `<form>`.                                                                                                                                                                                              |
| `id`                                                                         | `string`                                                                                                                                                                                 | `"simple-maths-captcha"` | Set as HTML `id` & `name` on the `<input>`s generated by the instance, after automatic addition of the `<input>`'s role.<br> E.g. `id: "contact-form-captcha"` results in `contact-form-captcha-answer` added as HTML `id` & `name` to the main `<input>`.                           |
| `ntp`<br> **Required**                                                       | [@codebundlesbyvik/ntp-sync](https://github.com/vikputthiscodeongit/ntp-sync?tab=readme-ov-file) instance                                                                                | -                        | `@codebundlesbyvik/ntp-sync` instance used for NTP sync before problem generation.                                                                                                                                                                                                   |
| `generatorEndpointUrl`<br> **Required if `generatorEndpoint` not provided.** | `string`                                                                                                                                                                                 | -                        | URL of the endpoint of the problem generator. Should return an **array** with a **length of 3**, the **first 2 items** being the **digits that compose the maths problem** and the **final item** being a **Unix timestamp in milliseconds after which the problem is invalidated**. |
| `generatorEndpoint`<br> **Required if `generatorEndpointUrl` not provided.** | [@codebundlesbyvik/js-helpers `fetchWithTimeout` parameters](https://github.com/vikputthiscodeongit/js-helpers?tab=readme-ov-file#fetchwithtimeoutresource-fetchoptions-timeoutduration) | -                        | Parameters for the problem generator fetcher.                                                                                                                                                                                                                                        |
| `answerInputElClass`                                                         | `string`                                                                                                                                                                                 | `undefined`              | HTML `class` to add to the main `<input>`.                                                                                                                                                                                                                                           |
| `answerInputElEventHandlers`                                                 | [`addEventListener()` parameters](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#parameters)                                                              | `undefined`              | Event handlers to add to the main `<input>`.                                                                                                                                                                                                                                         |
| `labelElLoadingText`                                                         | `string`                                                                                                                                                                                 | `"Loading CAPTCHA"`      | Text shown as `<label>` content when loading.                                                                                                                                                                                                                                        |
| `loaderEl`                                                                   | `HTMLElement`                                                                                                                                                                            | `undefined`              | Element to add after the `<label>` when loading.                                                                                                                                                                                                                                     |

<br>

## Methods

### `.isCaptchaInputEl(id: string)`

Check if the provided `id` matches the `id` of a CAPTCHA `<input>`.

<br>

The following methods are automatically called when needed.

### `.activate()`

Performs NTP sync, requests a new maths problem, inserts it and 3 `<input>`s (one of which used by the user for providing the answer) in the DOM and schedules `.deactivate()` call.

### `.deactivate()`

Removes the `<input>` for providing the answer from the DOM and inserts the activator button.

<br>

## License

Mozilla Public License 2.0 © 2025 [Viktor Chin-Kon-Sung](https://github.com/vikputthiscodeongit)
