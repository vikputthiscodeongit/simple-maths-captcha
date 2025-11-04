import type Ntp from "@codebundlesbyvik/ntp-sync";
interface OptionsGeneratorEndpointFetchUrl {
    dataEndpointUrl: string;
}
interface OptionsGeneratorEndpointFetchProps {
    dataEndpoint: {
        url: RequestInfo | URL;
        fetchOptions?: RequestInit;
        timeoutDuration?: number;
    };
}
type Options = (OptionsGeneratorEndpointFetchUrl | OptionsGeneratorEndpointFetchProps) & {
    activatorButtonEl: HTMLButtonElement | HTMLInputElement;
    id?: string;
    ntp: Ntp;
    dataHandlerFn: (response: Response) => Promise<{
        digit1: number;
        digit2: number;
        validForTime: number;
        generationTime: number;
    } | [number, number, number] | null>;
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
    #private;
    readonly activatorButtonEl: HTMLButtonElement | HTMLInputElement;
    readonly id: string;
    ntp: Ntp;
    readonly formEl: HTMLFormElement;
    readonly fieldEl: HTMLElement;
    readonly answerInputEl: HTMLInputElement;
    labelElLoadingText: string;
    readonly labelEl: HTMLLabelElement;
    readonly digit1InputEl: HTMLInputElement;
    readonly digit2InputEl: HTMLInputElement;
    loaderEl: HTMLElement | null;
    constructor(options: Options);
    get active(): boolean;
    activate(): Promise<void>;
    deactivate(): void;
}
export {};
