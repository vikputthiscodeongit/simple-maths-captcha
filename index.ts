import { createEl, fetchWithTimeout, wait } from "@codebundlesbyvik/js-helpers";
import Ntp from "@codebundlesbyvik/ntp-sync";

interface OptionsGeneratorEndpointFetchUrl {
    generatorEndpointUrl: string;
}

interface OptionsGeneratorEndpointFetchProps {
    generatorEndpoint: {
        url: RequestInfo | URL;
        fetchOptions?: RequestInit;
        timeoutDuration?: number;
    };
}

type Options = (OptionsGeneratorEndpointFetchUrl | OptionsGeneratorEndpointFetchProps) & {
    activatorButtonEl: HTMLButtonElement | HTMLInputElement;
    id?: string;
    ntp: Ntp;
    answerInputElClass?: string;
    answerInputElEventHandlers?: {
        type: string;
        listener: () => void;
        options?: AddEventListenerOptions;
    }[];
    labelElLoadingText?: string;
    loaderEl?: HTMLElement;
};

export default class SimpleMathsCaptcha {
    readonly activatorButtonEl: HTMLButtonElement | HTMLInputElement;
    readonly id: string;
    ntp: Ntp;
    readonly #problemFetchOptions: [RequestInfo | URL, RequestInit?, number?];

    readonly #activatorButtonElDefaultProps: string[];
    readonly formEl: HTMLFormElement;
    readonly fieldEl: HTMLElement;
    readonly #answerInputElDefaultProps: string[];
    readonly answerInputEl: HTMLInputElement;
    labelElLoadingText: string;
    readonly labelEl: HTMLLabelElement;
    readonly #digit1InputEl: HTMLInputElement;
    readonly #digit2InputEl: HTMLInputElement;
    loaderEl: HTMLElement | null;

    #active: boolean;
    #expiryTimerAbortController: AbortController | null;

    constructor(options: Options) {
        const isOptionsWithGeneratorEndpointFetchProps = (
            options: Options,
        ): options is Exclude<Options, OptionsGeneratorEndpointFetchUrl> =>
            "generatorEndpoint" in options;

        this.activatorButtonEl = options.activatorButtonEl;

        const formEl = this.activatorButtonEl.closest("form");

        if (!formEl) {
            throw new Error("Input must be a child of a <form>.");
        }

        this.id = options.id ?? "simple-maths-captcha";

        if (
            SimpleMathsCaptcha.#instances.find(
                (item) => item.activatorButtonEl === this.activatorButtonEl || item.id === this.id,
            )
        ) {
            throw new Error("Activator button and/or instance ID already in use.");
        }

        SimpleMathsCaptcha.#instances.push({
            activatorButtonEl: this.activatorButtonEl,
            id: this.id,
        });

        this.ntp = options.ntp;
        this.#problemFetchOptions = isOptionsWithGeneratorEndpointFetchProps(options)
            ? [
                  options.generatorEndpoint.url,
                  options.generatorEndpoint.fetchOptions,
                  options.generatorEndpoint.timeoutDuration,
              ]
            : [options.generatorEndpointUrl];

        // Activator button should be marked invalid when the form is submitted without
        // the CAPTCHA being active.
        this.activatorButtonEl.setCustomValidity("required");
        this.#activatorButtonElDefaultProps = Array.from(this.activatorButtonEl.attributes).map(
            (attr) => attr.name,
        );

        this.formEl = formEl;
        this.fieldEl = this.activatorButtonEl.parentElement || this.formEl;
        const answerInputElProps = {
            type: "text",
            id: this.id + "-answer",
            class: options.answerInputElClass ?? null,
            name: this.id + "-answer",
            inputmode: "numeric",
            minlength: "1",
            required: "required",
        };
        this.#answerInputElDefaultProps = Object.keys(answerInputElProps);
        this.answerInputEl = createEl("input", answerInputElProps);
        this.labelElLoadingText = options.labelElLoadingText ?? "Loading CAPTCHA";
        this.labelEl = createEl("label", {
            for: answerInputElProps.id,
        });
        this.#digit1InputEl = createEl("input", {
            type: "hidden",
            id: this.id + "-digit-1",
            name: this.id + "-digit-1",
        });
        this.#digit2InputEl = createEl("input", {
            type: "hidden",
            id: this.id + "-digit-2",
            name: this.id + "-digit-2",
        });
        this.loaderEl = options.loaderEl ?? null;

        this.#active = false;
        this.#expiryTimerAbortController = null;

        this.activatorButtonEl.addEventListener("click", () => {
            const fn = async () => await this.activate();
            fn().catch((error) => {
                console.error(error);
                this.deactivate();
            });

            return;
        });

        options.answerInputElEventHandlers?.forEach((handler) => {
            this.answerInputEl.addEventListener(handler.type, handler.listener, handler.options);
        });

        return;
    }

    static #instances: { activatorButtonEl: HTMLButtonElement | HTMLInputElement; id: string }[] =
        [];

    get active() {
        return this.#active;
    }

    isCaptchaInputEl(id: string) {
        return (
            id === this.answerInputEl.id ||
            id === this.#digit1InputEl.id ||
            id === this.#digit2InputEl.id
        );
    }

    async #makeProblemData() {
        console.debug("#makeProblemData: Running...");

        const ntpValues = await this.ntp.sync();

        if (!ntpValues) {
            throw new Error("NTP values fetch failed.");
        }

        const response = await fetchWithTimeout(...this.#problemFetchOptions);

        if (!response.ok) {
            throw new Error(`Problem fetch failed.`);
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
    }

    async activate() {
        console.info("activate: Running...");

        if (this.#active) {
            console.warn("Already active.");
            return;
        }

        this.#active = true;
        this.#expiryTimerAbortController = new AbortController();

        this.activatorButtonEl.remove();

        this.labelEl.textContent = this.labelElLoadingText;
        this.fieldEl.prepend(this.labelEl);

        if (this.loaderEl) {
            this.labelEl.after(this.loaderEl);
        }

        this.answerInputEl.value = "";

        for (const attr of Array.from(this.answerInputEl.attributes)) {
            if (this.#answerInputElDefaultProps.includes(attr.name)) continue;

            this.answerInputEl.removeAttribute(attr.name);
        }

        const [digit1, digit2, expiryTime] = await this.#makeProblemData();

        this.labelEl.textContent = `${digit1} + ${digit2} =`;
        this.#digit1InputEl.value = digit1.toString();
        this.#digit2InputEl.value = digit2.toString();
        this.labelEl.after(this.answerInputEl, this.#digit1InputEl, this.#digit2InputEl);

        if (this.loaderEl) {
            this.loaderEl.remove();
        }

        await wait(expiryTime, true, this.#expiryTimerAbortController.signal)
            .then(() => this.deactivate())
            .catch((abortReason) => console.info(abortReason));

        return;
    }

    deactivate() {
        console.info("deactivate: Running...");

        if (!this.#active) {
            console.warn("Already deactivated.");
            return;
        }

        this.#expiryTimerAbortController?.abort("Scheduled deactivation aborted.");

        this.labelEl.remove();
        this.answerInputEl.remove();
        this.#digit1InputEl.remove();
        this.#digit2InputEl.remove();

        if (this.loaderEl) {
            this.loaderEl.remove();
        }

        for (const attr of Array.from(this.activatorButtonEl.attributes)) {
            if (this.#activatorButtonElDefaultProps.includes(attr.name)) continue;

            this.activatorButtonEl.removeAttribute(attr.name);
        }

        this.fieldEl.prepend(this.activatorButtonEl);

        this.#active = false;

        return;
    }
}
