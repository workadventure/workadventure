let activeErrorHandler: (error: Error) => void = (error: Error) => {
    console.error(`${error.name} : ${error.message}`);
};

export const errorHandler: (error: Error) => void = (error: Error) => {
    activeErrorHandler(error);
};

export const setErrorHandler = (newErrorHandler: (error: Error) => void) => {
    activeErrorHandler = newErrorHandler;
};
