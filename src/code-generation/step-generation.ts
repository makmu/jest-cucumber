import { Step } from '../models';
import { indent } from './utils';

const stepTemplate = (stepKeyword: string, stepMatcher: string, stepArgumentVariables: string[]) => {
    return `${stepKeyword}(${stepMatcher}, (${stepArgumentVariables.join(', ')}) => {\n\n});`;
};

const getStepFunctionWrapperName = (stepKeyword: string, stepText: string) => {
    // tslint:disable-next-line:max-line-length
    return `${stepKeyword}_${stepText.replace(stepTextArgumentRegex, 'X').replace(/\s/g, '_').replace(/[^A-Za-z0-9_]/g, '')}`;
};

const stepWrapperFunctionTemplate = (
  stepKeyword: string,
  stepText: string,
  stepMatcher: string,
  stepArgumentVariables: string[],
) => {
    // tslint:disable-next-line:max-line-length
    return `export const ${getStepFunctionWrapperName(stepKeyword, stepText)} = (${stepKeyword}) => {\n${indent(stepTemplate(stepKeyword, stepMatcher, stepArgumentVariables), 1).slice(0, -1)}\n}`;
};

const stepWrapperFunctionCallTemplate = (stepText: string, stepKeyword: string) => {
    return `${getStepFunctionWrapperName(stepKeyword, stepText)}(${stepKeyword})`;
};

const stepTextArgumentRegex = /([-+]?[0-9]*\.?[0-9]+)|\"([^"<]+)\"|\"?\<([^"<]*)\>\"?/g;

const escapeRegexCharacters = (text: string) => {
    return text
        .replace(/\$/g, '\\$')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
};

const convertStepTextToRegex = (step: Step) => {
    const stepText = escapeRegexCharacters(step.stepText);
    let matches: RegExpExecArray | null;
    let finalStepText = stepText;

    while (matches = stepTextArgumentRegex.exec(stepText)) {
        const [fullMatch, numberMatch, stringMatch] = matches;

        if (numberMatch) {
            finalStepText = finalStepText.replace(numberMatch, '(\\d+)');
        } else if (stringMatch) {
            finalStepText = finalStepText.replace(stringMatch, '(.*)');
        } else {
            finalStepText = finalStepText.replace(fullMatch, '(.*)');
        }
    }

    return `/^${finalStepText}$/`;
};

const getStepArguments = (step: Step) => {
    const stepArgumentVariables: string[] = [];

    let match: RegExpExecArray | null;
    let index: number = 0;

    while (match = stepTextArgumentRegex.exec(step.stepText)) {
        stepArgumentVariables.push(`arg${index}`);
        index++;
    }

    if (step.stepArgument) {
        if (typeof step.stepArgument === 'string') {
            stepArgumentVariables.push('docString');
        } else {
            stepArgumentVariables.push('table');
        }
    }

    return stepArgumentVariables;
};

const getStepMatcher = (step: Step) => {
    let stepMatcher: string = '';

    if (step.stepText.match(stepTextArgumentRegex)) {
        stepMatcher = convertStepTextToRegex(step);
    } else {
        stepMatcher = `'${step.stepText.replace(/'+/g, `\\'`)}'`;
    }

    return stepMatcher;
};

export const getStepKeyword = (step: Step) => {
    return step.keyword;
};

export const generateStepCode = (step: Step, generateWrapperFunction = false) => {
    const stepKeyword = getStepKeyword(step);
    const stepMatcher = getStepMatcher(step);
    const stepArguments = getStepArguments(step);

    if (generateWrapperFunction) {
        return stepWrapperFunctionTemplate(stepKeyword, step.stepText, stepMatcher, stepArguments);
    } else {
        return stepTemplate(stepKeyword, stepMatcher, stepArguments);
    }
};

export const generateStepFunctionCall = (step: Step) => {
    const stepKeyword = getStepKeyword(step);

    return stepWrapperFunctionCallTemplate(step.stepText, stepKeyword);
};
