import { createEl, fetchWithTimeout, wait } from "@codebundlesbyvik/js-helpers";
import Ntp, { Options as NtpOptions } from "@codebundlesbyvik/ntp-sync";

interface DefaultOptions {
    baseId: string;
}

interface Options extends Partial<DefaultOptions> {
    activatorButtonEl: HTMLButtonElement | HTMLInputElement;
    generatorEndpointUrl?: string;
    generatorEndpoint?: {
        url: RequestInfo | URL;
        fetchOptions?: RequestInit;
        timeoutDuration?: number;
    };
    ntpOptions: NtpOptions;
    answerInputElEventHandlers?: {
        type: string;
        listener: () => void;
        options?: AddEventListenerOptions;
    }[];
}

const DEFAULT_INSTANCE_OPTIONS: DefaultOptions = {
    baseId: "simple-maths-captcha",
};

export default class SimpleMathsCaptcha {
    problemFetchOptions: [RequestInfo | URL, RequestInit?, number?];
    ntp: Ntp;
    baseId: string;
    activatorButtonElDefaultProps: string[];
    activatorButtonEl: HTMLButtonElement | HTMLInputElement;
    formEl: HTMLFormElement;
    fieldEl: HTMLElement;
    answerInputElDefaultProps: string[];
    answerInputEl: HTMLInputElement;
    labelEl: HTMLLabelElement;
    digit1InputEl: HTMLInputElement;
    digit2InputEl: HTMLInputElement;
    expiryTimerEl: HTMLSpanElement;
    loaderEl: HTMLDivElement;

    active: boolean;
    expiryTimer: ReturnType<typeof setInterval> | undefined;
    expiryTimerAbortController: AbortController | undefined;

    constructor(options: Options) {
        try {
            const mergedOptions = {
                ...DEFAULT_INSTANCE_OPTIONS,
                ...options,
            };

            this.activatorButtonEl = mergedOptions.activatorButtonEl;
            // Activator button should be marked invalid when the form is submitted without
            // the CAPTCHA being active.
            this.activatorButtonEl.setCustomValidity("required");

            const fieldEl = this.activatorButtonEl.parentElement;
            const formEl = this.activatorButtonEl.closest("form");

            if (!fieldEl || !formEl) {
                const errorText = !fieldEl
                    ? "Input must have a parent element."
                    : "Input must be a <form> child.";
                throw new Error(errorText);
            }

            this.ntp = new Ntp(mergedOptions.ntpOptions);
            this.baseId = mergedOptions.baseId;
            if (options.generatorEndpointUrl && options.generatorEndpoint) {
                console.warn(
                    "`generatorEndpointUrl` and `generatorEndpoint.url` are both provided. `generatorEndpoint.url` takes preference.",
                );
            }

            const generatorEndpointUrl = options.generatorEndpoint
                ? options.generatorEndpoint.url
                : options.generatorEndpointUrl;

            if (!generatorEndpointUrl) {
                throw new Error(
                    "Problem generator endpoint URL must be provided, either as generatorEndpointUrl or generatorEndpoint.url.",
                );
            }

            this.problemFetchOptions = [
                generatorEndpointUrl,
                options.generatorEndpoint?.fetchOptions,
                options.generatorEndpoint?.timeoutDuration,
            ];
            this.activatorButtonElDefaultProps = [];

            for (const attr of Array.from(this.activatorButtonEl.attributes)) {
                this.activatorButtonElDefaultProps.push(attr.name);
            }

            this.formEl = formEl;
            this.fieldEl = fieldEl;
            const answerInputElProps = {
                type: "text",
                id: this.baseId + "-answer",
                name: this.baseId + "-answer",
                inputmode: "numeric",
                minlength: "1",
                required: "true",
            };
            this.answerInputElDefaultProps = Object.keys(answerInputElProps);
            this.answerInputEl = createEl("input", answerInputElProps);
            this.labelEl = createEl("label", {
                for: this.answerInputEl.id,
            });
            this.digit1InputEl = createEl("input", {
                type: "hidden",
                id: this.baseId + "-digit-1",
                name: this.baseId + "-digit-1",
            });
            this.digit2InputEl = createEl("input", {
                type: "hidden",
                id: this.baseId + "-digit-2",
                name: this.baseId + "-digit-2",
            });
            this.expiryTimerEl = createEl("span");
            this.loaderEl = createEl("div", {
                class: "spinner spinner--lg",
            });

            this.active = false;
            this.expiryTimer = undefined;
            this.expiryTimerAbortController = undefined;

            this.activatorButtonEl.addEventListener("click", () => {
                const fn = async () => await this.activate();
                fn().catch((error) => {
                    console.error(error);
                    this.deactivate();
                });

                return;
            });

            if (mergedOptions.answerInputElEventHandlers) {
                mergedOptions.answerInputElEventHandlers.forEach((handler) => {
                    this.answerInputEl.addEventListener(
                        handler.type,
                        handler.listener,
                        handler.options,
                    );
                });
            }

            return;
        } catch (error) {
            throw error instanceof Error
                ? error
                : new Error("Unknown error during initialization!");
        }
    }

    isCaptchaInputEl(id: string) {
        return (
            id === this.answerInputEl.id ||
            id === this.digit1InputEl.id ||
            id === this.digit2InputEl.id
        );
    }

    async activate() {
        console.info("activate: Running...");

        if (this.active) {
            console.info("activate: CAPTCHA already active!");
            return;
        }

        this.active = true;
        this.expiryTimerAbortController = new AbortController();

        try {
            this.activatorButtonEl.remove();

            this.labelEl.textContent = "Loading CAPTCHA";
            this.fieldEl.prepend(this.labelEl, this.loaderEl);

            this.answerInputEl.value = "";

            for (const attr of Array.from(this.answerInputEl.attributes)) {
                if (this.answerInputElDefaultProps.includes(attr.name)) continue;

                this.answerInputEl.removeAttribute(attr.name);
            }

            const [digit1, digit2, expiryTime] = await this.#makeProblemData();

            this.labelEl.textContent = `${digit1} + ${digit2} =`;
            this.digit1InputEl.value = digit1.toString();
            this.digit2InputEl.value = digit2.toString();
            this.labelEl.after(this.answerInputEl, this.digit1InputEl, this.digit2InputEl);

            this.loaderEl.remove();

            let expiryTimeSec = Math.round(expiryTime / 1000);

            this.expiryTimer = setInterval(() => {
                expiryTimeSec = expiryTimeSec - 1;

                if (expiryTimeSec < 6) {
                    this.expiryTimerEl.textContent = `Expires in ${expiryTimeSec} s`;

                    if (!document.body.contains(this.expiryTimerEl)) {
                        this.answerInputEl.after(this.expiryTimerEl);
                    }
                }
            }, 1000);

            await wait(expiryTime, true, this.expiryTimerAbortController.signal)
                .then(() => {
                    clearInterval(this.expiryTimer);

                    this.deactivate();
                })
                .catch((abortReason) => console.info(abortReason));

            return;
        } catch (error) {
            throw error instanceof Error
                ? error
                : new Error("Unknown error during CAPTCHA activation!");
        }
    }

    deactivate() {
        console.info("deactivate: Running...");

        if (!this.active) {
            console.info("activate: CAPTCHA already deactivated!");
            return;
        }

        clearInterval(this.expiryTimer);

        if (this.expiryTimerAbortController) {
            this.expiryTimerAbortController.abort("Scheduled deactivation aborted.");
        }

        this.labelEl.remove();
        this.answerInputEl.remove();
        this.digit1InputEl.remove();
        this.digit2InputEl.remove();
        this.expiryTimerEl.remove();
        this.loaderEl.remove();

        for (const attr of Array.from(this.activatorButtonEl.attributes)) {
            if (this.activatorButtonElDefaultProps.includes(attr.name)) continue;

            this.activatorButtonEl.removeAttribute(attr.name);
        }

        this.fieldEl.prepend(this.activatorButtonEl);

        this.active = false;

        return;
    }

    async #makeProblemData() {
        console.info("#makeProblemData: Running...");

        try {
            const ntpValues = await this.ntp.sync();

            if (!ntpValues) {
                throw new Error("NTP values fetch failed.");
            }

            const response = await fetchWithTimeout(...this.problemFetchOptions);

            if (!response.ok) {
                throw new Error(`Problem fetch failed with HTTP status code ${response.status}.`);
            }

            const fetchedData = (await response.json()) as {
                problem_data: [number, number, number];
            };
            console.debug("#makeProblemData - fetchedData:", fetchedData);
            const [digit1, digit2, invalidAfterTime] = fetchedData.problem_data;

            const expiryTime = Math.ceil(Math.max(invalidAfterTime - ntpValues.correctedDate, 0));
            const problemData = [digit1, digit2, expiryTime];
            console.debug("#makeProblemData - problemData:", problemData);

            return problemData;
        } catch (error) {
            throw error instanceof Error ? error : new Error("Unknown error during problem fetch!");
        }
    }
}
