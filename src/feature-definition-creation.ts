import { checkThatFeatureFileAndStepDefinitionsHaveSameScenarios } from './validation/scenario-validation';
import {
    Feature, Scenario, Rule,
    Options, ScenarioOutline,
} from './models';
import {
    ensureThereAreNoMissingSteps,
    matchSteps,
} from './validation/step-definition-validation';
import { applyTagFilters } from './tag-filtering';
import { generateStepCode } from './code-generation/step-generation';

export type StepsDefinitionCallbackOptions = {
    defineStep: DefineStepFunction;
    given: DefineStepFunction;
    when: DefineStepFunction;
    then: DefineStepFunction;
    and: DefineStepFunction;
    but: DefineStepFunction;
    pending: () => void;
};

export type ScenariosDefinitionCallbackFunction = (defineScenario: DefineScenarioFunctionWithAliases) => void;

export type RulesDefinitionCallbackFunction = (defineRule: DefineRuleFunction) => void;

export type DefineRuleFunction = (
    ruleTitle: string,
    scenariosDefinitionCallback: ScenariosDefinitionCallbackFunction
) => void;

export type DefineScenarioFunction = (
    scenarioTitle: string,
    stepsDefinitionCallback: StepsDefinitionCallbackFunction,
    timeout?: number,
) => void;

export type DefineScenarioFunctionWithAliases = DefineScenarioFunction & {
    skip: DefineScenarioFunction;
    only: DefineScenarioFunction;
    concurrent: DefineScenarioFunction;
};

export type StepsDefinitionCallbackFunction = (options: StepsDefinitionCallbackOptions) => void;
export type DefineStepFunction = (stepMatcher: string | RegExp, stepDefinitionCallback: (...args: any[]) => any) => any;

const processScenarioTitleTemplate = (
    scenarioTitle: string,
    group: Rule,
    options: Options,
    parsedScenario: Scenario,
    parsedScenarioOutline: ScenarioOutline,
) => {
    if (options && options.scenarioNameTemplate) {
        try {
            return  options && options.scenarioNameTemplate({
                featureTitle: group.title,
                scenarioTitle: scenarioTitle.toString(),
                featureTags: group.tags,
                scenarioTags: (parsedScenario || parsedScenarioOutline).tags
            });
        } catch (err) {
            throw new Error(
                // tslint:disable-next-line:max-line-length
                `An error occurred while executing a scenario name template. \nTemplate:\n${options.scenarioNameTemplate}\nError:${err.message}`,
            );
        }
    }

    return scenarioTitle;
};

const checkForPendingSteps = (scenarioFromStepDefinitions: Scenario) => {
    let scenarioPending = false;

    scenarioFromStepDefinitions.steps.forEach((step) => {
        try {
            if (step.stepFunction.toString().indexOf('pending()') !== -1) {
                const pendingTest = new Function(`
                    let isPending = false;

                    const pending = function () {
                        isPending = true;
                    };

                    (${step.stepFunction})();

                    return isPending;
                `);

                scenarioPending = pendingTest();
            }
        } catch (err) {
            // Ignore
        }
    });

    return scenarioPending;
};

const getTestFunction = (skippedViaTagFilter: boolean, only: boolean, skip: boolean, concurrent: boolean) => {
    if (skip || skippedViaTagFilter) {
        return test.skip;
    } else if (only) {
        return test.only;
    } else if (concurrent) {
        return test.concurrent;
    } else {
        return test;
    }
};

const defineScenario = (
    scenarioTitle: string,
    scenarioFromStepDefinitions: Scenario,
    parsedScenario: Scenario,
    only: boolean = false,
    skip: boolean = false,
    concurrent: boolean = false,
    timeout: number | undefined = undefined,
) => {
    const testFunction = getTestFunction(parsedScenario.skippedViaTagFilter, only, skip, concurrent);

    testFunction(scenarioTitle, () => {
        return scenarioFromStepDefinitions.steps.reduce((promiseChain, nextStep, index) => {
            const parsedStep = parsedScenario.steps[index];
            const stepArgument = parsedStep.stepArgument;
            const matches = matchSteps(
                parsedScenario.steps[index].stepText,
                scenarioFromStepDefinitions.steps[index].stepMatcher
            );
            let matchArgs: string[] = [];

            if (matches && (matches as RegExpMatchArray).length) {
                matchArgs = (matches as RegExpMatchArray).slice(1);
            }

            const args = [ ...matchArgs, stepArgument ];

            return promiseChain.then(() => {
              return Promise.resolve()
                .then(() => nextStep.stepFunction(...args))
                .catch((error) => {
                    error.message = `jest-cucumber: ${parsedStep.stepText} (line ${parsedStep.lineNumber})\n\n${error.message}`;
                    throw error;
                });
            });
        }, Promise.resolve());
    }, timeout);
};

const createDefineScenarioFunction = (
    feature: Rule,
    options: Options,
    only: boolean = false,
    skip: boolean = false,
    concurrent: boolean = false,
) => {
    const defineScenarioFunction: DefineScenarioFunction = (
        scenarioTitle: string,
        stepsDefinitionFunctionCallback: StepsDefinitionCallbackFunction,
        timeout?: number,
    ) => {

        const matchingScenarios = feature.scenarios.filter( s => s.title === scenarioTitle);

        if(matchingScenarios.length === 0) {
          throw new Error(`No scenarios found in feature/rule that match scenario title "${scenarioTitle}."`);
        }
        if(matchingScenarios.length > 1) {
          throw new Error(`More than one scenario found in feature/rule that match scenario title "${scenarioTitle}"`);
        }

        const scenarioFromStepDefinitions = matchingScenarios[0];

        stepsDefinitionFunctionCallback({
            defineStep: createDefineStepFunction(scenarioFromStepDefinitions),
            given: createDefineStepFunction(scenarioFromStepDefinitions),
            when: createDefineStepFunction(scenarioFromStepDefinitions),
            then: createDefineStepFunction(scenarioFromStepDefinitions),
            and: createDefineStepFunction(scenarioFromStepDefinitions),
            but: createDefineStepFunction(scenarioFromStepDefinitions),
            pending: () => {
                // Nothing to do
            }
        });

        const parsedScenario = feature.scenarios
            .filter((s) => s.title.toLowerCase() === scenarioTitle.toLowerCase())[0];

        const parsedScenarioOutline = feature.scenarioOutlines
            .filter((s) => s.title.toLowerCase() === scenarioTitle.toLowerCase())[0];

        scenarioTitle = processScenarioTitleTemplate(
            scenarioTitle,
            feature,
            options,
            parsedScenario,
            parsedScenarioOutline,
        );

        ensureThereAreNoMissingSteps(
            options,
            parsedScenario || parsedScenarioOutline,
        );

        if (checkForPendingSteps(scenarioFromStepDefinitions)) {
            xtest(scenarioTitle, () => {
                    // Nothing to do
            }, undefined);
        } else if (parsedScenario) {
            defineScenario(
                scenarioTitle,
                scenarioFromStepDefinitions,
                parsedScenario,
                only,
                skip,
                concurrent,
                timeout,
            );
        } else if (parsedScenarioOutline) {
            parsedScenarioOutline.scenarios.forEach((scenario) => {
                defineScenario(
                    (scenario.title || scenarioTitle),
                    scenarioFromStepDefinitions,
                    scenario,
                    only,
                    skip,
                    concurrent,
                    timeout,
                );
            });
        }
    };

    return defineScenarioFunction;
};

const createDefineScenarioFunctionWithAliases = (
    group: Rule,
    options: Options
) => {
    const defineScenarioFunctionWithAliases = createDefineScenarioFunction(
        group,
        options
    );

    (defineScenarioFunctionWithAliases as DefineScenarioFunctionWithAliases).only = createDefineScenarioFunction(
        group,
        options,
        true,
        false,
        false,
    );

    (defineScenarioFunctionWithAliases as DefineScenarioFunctionWithAliases).skip = createDefineScenarioFunction(
        group,
        options,
        false,
        true,
        false,
    );

    (defineScenarioFunctionWithAliases as DefineScenarioFunctionWithAliases).concurrent = createDefineScenarioFunction(
        group,
        options,
        false,
        false,
        true,
    );

    return defineScenarioFunctionWithAliases as DefineScenarioFunctionWithAliases;
};

const createDefineStepFunction = (scenario: Scenario) => {
    return (stepMatcher: string | RegExp, stepFunction: () => any) => {

        const unmatchedSteps = scenario.steps.filter(s => s.stepMatcher === undefined);
        if(unmatchedSteps.length == 0) {
            throw new Error(`Step definition "${stepMatcher}" found for scenario "${scenario.title}" but all steps already defined.`)
        }

        const matchingSteps = scenario.steps.filter(s => matchSteps(s.stepText, stepMatcher));

        if(matchSteps.length === 0) {
            throw new Error(`Scenario "${scenario.title}" in feature file has no step matching "${stepMatcher}"`)
        }
        else if(matchSteps.length > 1) {
            throw new Error(`More than one step in scenario "${scenario.title}" matches "${stepMatcher}"`)
        }

        const matchingStep = matchingSteps[0];

        if(matchingStep !== unmatchedSteps[0]) {
            const nextStepIndex = scenario.steps.length - unmatchedSteps.length;
            throw new Error(`Expected step #${nextStepIndex + 1} to match "${scenario.steps[nextStepIndex]}". Try adding the following code:\n\n${generateStepCode(scenario.steps[nextStepIndex])}`)
        }

        if(matchingSteps[0].stepMatcher) {
            throw new Error(`Step ${matchingSteps[0].stepText} in scenario "${scenario.title}" matches "${stepMatcher} but also matches "${matchingSteps[0].stepMatcher}"`)
        }

        matchingSteps[0].stepMatcher = stepMatcher;
        matchingSteps[0].stepFunction = stepFunction;
    };
};

const defineScenarioGroup = (
    group: Rule,
    scenariosDefinitionCallback: ScenariosDefinitionCallbackFunction,
    options: Options,
) => {

    const parsedFeatureWithTagFiltersApplied = applyTagFilters(group, options.tagFilter);

    if (
        parsedFeatureWithTagFiltersApplied.scenarios.length === 0
            && parsedFeatureWithTagFiltersApplied.scenarioOutlines.length === 0
    ) {
        return;
    }

    scenariosDefinitionCallback(
        createDefineScenarioFunctionWithAliases(parsedFeatureWithTagFiltersApplied, options)
    );

    checkThatFeatureFileAndStepDefinitionsHaveSameScenarios(
        parsedFeatureWithTagFiltersApplied,
        options
    );
};

export function defineFeature(
    featureFromFile: Feature,
    scenariosDefinitionCallback: ScenariosDefinitionCallbackFunction
) {
    describe(featureFromFile.title, () => {
        defineScenarioGroup(featureFromFile, scenariosDefinitionCallback, featureFromFile.options);
    });
}

export function defineRuleBasedFeature(
    featureFromFile: Feature,
    rulesDefinitionCallback: RulesDefinitionCallbackFunction
) {
    describe(featureFromFile.title, () => {
        rulesDefinitionCallback((ruleText: string, callback: ScenariosDefinitionCallbackFunction) => {
            const matchingRules = featureFromFile.rules.filter(
                (rule) => rule.title.toLocaleLowerCase() === ruleText.toLocaleLowerCase()
            );
            if (matchingRules.length != 1) {
                throw new Error(`No matching rule found for '${ruleText}'"`);
            }

            describe(ruleText, () => {
                defineScenarioGroup(matchingRules[0], callback, featureFromFile.options);
            })
        });
    });
}
