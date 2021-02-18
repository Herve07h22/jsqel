const checkHasExpectedFunctions = (dbService, arrayOfFunctionNames = []) => {
  if (typeof dbService !== "object") return false;

  return arrayOfFunctionNames.every(
    (functionName) =>
      Object.getOwnPropertyNames(dbService).includes(functionName) &&
      typeof dbService[functionName] === "function"
  );
};

module.exports = { checkHasExpectedFunctions };
