# Simple Maths CAPTCHA

[![npm](https://img.shields.io/npm/v/@codebundlesbyvik/simple-maths-captcha)](https://www.npmjs.com/package/@codebundlesbyvik/simple-maths-captcha)
[![npm - downloads per week](https://img.shields.io/npm/dw/@codebundlesbyvik/simple-maths-captcha)](https://www.npmjs.com/package/@codebundlesbyvik/simple-maths-captcha)

Easy to use, easy to solve CAPTCHA.

![simple-maths-captcha](https://github.com/user-attachments/assets/7e036860-1391-4429-ad40-47de2b5f6d67)

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

The form to which the CAPTCHA is linked must contain a button to be used for activating the CAPTCHA.
Furthermore, the generator endpoint URL must be provided as instance option as well as [options for the NTP time sync library]().

``` shell
# Install package from npm
npm install @codebundlesbyvik/simple-maths-captcha
```

If you're not using a module bundler then either:

* [Download the latest release from the GitHub releases page](https://github.com/vikputthiscodeongit/simple-maths-captcha/releases/latest), or
* [Load the JavaScript](https://cdn.jsdelivr.net/npm/@codebundlesbyvik/simple-maths-captcha@1.0.0) via the jsdelivr CDN.

And import the JavaScript as a module in your HTML file.

For the example below I assume the main JavaScript file is processed by a module bundler.

``` javascript
import SimpleMathsCaptcha from "@codebundlesbyvik/simple-maths-captcha";
import { convertUnixTimeFormatToMs } from "@codebundlesbyvik/ntp-sync";

new SimpleMathsCaptcha({
    activatorButtonEl: document.querySelector("#simple-maths-captcha-activator-button"),
    generatorEndpointUrl: "./api/simple-maths-captcha/generate-problem.php",
    ntpOptions: {
        t1EndpointUrl: "./api/ntp/get-server-time.php",
        t1CalcFn: async function t1CalcFn(response: Response) {
            const data = (await response.json()) as { req_received_time: number };

            return convertUnixTimeFormatToMs(data.req_received_time);
        },
        // Providing a t2CalcFn for greater accuracy is recommended but not required.
        t2CalcFn: function t2CalcFn(resHeaders: Headers) {
            // Header value example: t=1747777363406069 D=110
            const header = resHeaders.get("Response-Timing");

            if (!header) {
                return null;
            }

            const reqReceivedTime = /\bt=([0-9]+)\b/.exec(header);
            const reqProcessingTime = /\bD=([0-9]+)\b/.exec(header);

            if (!reqReceivedTime || !reqProcessingTime) {
                return null;
            }

            const resTransmitTime =
                Number.parseInt(reqReceivedTime[1]) + Number.parseInt(reqProcessingTime[1]);

            return convertUnixTimeFormatToMs(resTransmitTime);
        },
    }
});

// That's all!
// The CAPTCHA initializes on instance creation, activates when the activator button is pressed
// and automatically deactivates after the CAPTCHA has expired.
```

The implementation of the back end components is up to you. If you need some inspiration you can check out [how I did it in PHP for my own website](https://github.com/vikputthiscodeongit/viktor-web/tree/main/components/simple-maths-captcha).

<br>

## Browser support

To be specified.

Library is a module and should be supported by recent versions of all current browsers.

<br>

## Instance options

| Property                                | Type                                                                                                                                    | Default                | Description                                                                                                                                                                                                                                                                   |
| :-------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- | :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **! REQUIRED !** `activatorButtonEl`    | `HTMLButtonElement` \| `HTMLInputElement`                                                                                               | -                      | Form control which the user presses to activate the CAPTCHA. Must be a child of the `<form>`.                                                                                                                                                                                 |
| **! REQUIRED !** `ntpOptions`           | `NtpOptions`                                                                                                                            | -                      | [@codebundlesbyvik/ntp-sync]() options.                                                                                                                                                                                                                                       |
| `baseId`                                | `string`                                                                                                                                | `simple-maths-captcha` | Base ID used for generating the DOM elements' `id` & `name` attributes.                                                                                                                                                                                                       |
| `answerInputElEventHandlers`            | Object with [`addEventListener()` parameters](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#parameters) | `undefined`            | Event handlers with these options will be added to the `<input>` element in which the user has to provide the answer.                                                                                                                                                         |
| `generatorEndpointUrl`<br> **Required if `generatorEndpoint` not provided.** | `string`                                                                                                                                                                                  | -           | URL of the endpoint of the problem generator. Should return an **array** with a **length of 3**, the **first 2 items** being the **digits that compose the maths problem** and the **final item** being a **Unix timestamp in milliseconds after which the problem is invalidated**.                                            |
| `generatorEndpoint`<br> **Required if `generatorEndpointUrl` not provided.** | [@codebundlesbyvik/js-helpers `fetchWithTimeout` parameters](https://github.com/vikputthiscodeongit/js-helpers?tab=readme-ov-file#fetchwithtimeoutresource-fetchoptions-timeoutduration). | -           | Parameters for the problem generator fetcher.                                                                                                                                                                                                                                                                                   |

<br>

## Methods

### `.isCaptchaInputEl(id: string)`

Check if the provided `id` matches the `id` of a CATPCHA `<input>` element.

<br>

The following methods are public but don't need to be used because they're called automatically when needed.

### `.activate()`

Requests a new problem, inserts it and the `<input>` for providing the answer in the DOM.

### `.deactivate()`

Removes the `<input>` for providing the answer from the DOM and inserts the activator button.

<br>

## License

Mozilla Public License 2.0 © 2025 [Viktor Chin-Kon-Sung](https://github.com/vikputthiscodeongit)
