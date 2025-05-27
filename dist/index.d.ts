import Ntp, { Options as NtpOptions } from "@codebundlesbyvik/ntp-sync";
interface Options {
    activatorButtonEl: HTMLButtonElement | HTMLInputElement;
    baseId?: string;
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
export default class SimpleMathsCaptcha {
    #private;
    activatorButtonEl: HTMLButtonElement | HTMLInputElement;
    id: string;
    problemFetchOptions: [RequestInfo | URL, RequestInit?, number?];
    ntp: Ntp;
    activatorButtonElDefaultProps: string[];
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
    constructor(options: Options);
    isCaptchaInputEl(id: string): boolean;
    activate(): Promise<void>;
    deactivate(): void;
}
export {};
