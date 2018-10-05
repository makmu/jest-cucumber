import { ParsedFeature } from '../models';
import { loadFeature } from '../parsed-feature-loading';
import { generateScenarioCodeWithSeparateStepFunctions, generateScenarioCode } from './scenario-generation';
import { generateStepCode } from './step-generation';

export enum ObjectTypeEnum {
    scenario,
    scenarioOutline,
    step
}

const findObjectByLineNumber = (
    feature: ParsedFeature, 
    lineNumber: number
): { object: any, type: ObjectTypeEnum } | null => {
    let found: any = null;
    let type: ObjectTypeEnum = ObjectTypeEnum.scenario;

    feature.scenarioOutlines.forEach(scenarioOutline => {
        if (scenarioOutline.lineNumber === lineNumber) {
            found = scenarioOutline;
            type = ObjectTypeEnum.scenarioOutline;
        }

        scenarioOutline.steps.forEach((step, index) => {
            if (step.lineNumber === lineNumber) {
                found = { steps: scenarioOutline.steps, index };
                type = ObjectTypeEnum.step;
            }
        });
    });

    feature.scenarios.forEach(scenario => {
        if (scenario.lineNumber === lineNumber) {
            found = scenario;
            type = ObjectTypeEnum.scenario;
        }

        scenario.steps.forEach((step, index) => {
            if (step.lineNumber === lineNumber) {
                found = { steps: scenario.steps, index };
                type = ObjectTypeEnum.step;
            }
        });
    });

    return found ? { object: found, type } : null;
};

export const generateCodeFromFeatureByLineNumber = (
    featureFilePath: string,
    lineNumber: number,
    stepDefsAsSeparateFunctions = false
) => {
    const feature = loadFeature(featureFilePath);

    const objectAtLine = findObjectByLineNumber(feature, lineNumber);

    if (objectAtLine === null) {
        return null;
    } else {
        switch (objectAtLine.type) {
            case ObjectTypeEnum.scenario:
            case ObjectTypeEnum.scenarioOutline:
                if (stepDefsAsSeparateFunctions) {
                    return generateScenarioCodeWithSeparateStepFunctions(objectAtLine.object);
                } else {
                    return generateScenarioCode(objectAtLine.object)
                }
            case ObjectTypeEnum.step:
                return generateStepCode(objectAtLine.object.steps, objectAtLine.object.index, stepDefsAsSeparateFunctions);
        }
    }
};
