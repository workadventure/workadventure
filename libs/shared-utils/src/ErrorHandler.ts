export let errorHandler: (error: Error) => void = (error: Error) => {
    console.error(`${error.name} : ${error.message}`);
};

export const setErrorHandler = (newErrorHandler: (error: Error) => void) => {
    errorHandler = newErrorHandler;
};
