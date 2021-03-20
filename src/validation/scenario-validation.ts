import {
    Feature,
    Scenario,
    ScenarioOutline,
    ErrorOptions,
    Options,
    Rule,
} from '../models';
import { generateScenarioCode } from '../code-generation/scenario-generation';

const findScenarioFromParsedFeature = (
    errors: string[],
    parsedScenarios: Array<Scenario | ScenarioOutline>,
    scenarioTitle: string,
    errorOptions: ErrorOptions,
) => {
    let matchingScenarios: Array<Scenario | ScenarioOutline> = [];

    if (parsedScenarios) {
        matchingScenarios = parsedScenarios
            .filter((parsedScenario) => parsedScenario.title.toLowerCase() === scenarioTitle.toLowerCase());
    }

    if (matchingScenarios.length === 0 && errorOptions.missingScenarioInFeature) {
        errors.push(`No scenarios found in feature file that match scenario title "${scenarioTitle}."`);

        return null;
    } else if (matchingScenarios.length > 1 && errorOptions.missingStepInFeature) {
        errors.push(`More than one scenario found in feature file that match scenario title "${scenarioTitle}"`);

        return null;
    }

    return matchingScenarios[0];
};

export const checkThatFeatureFileAndStepDefinitionsHaveSameScenarios = (
    scenarioGroup: Rule,
    options: Options
) => {
    const scenariosWithoutDefinition = scenarioGroup.scenarios.filter(s => !s.defined);

    if(options && options.errors === false) {
      return
    }

    const errors = scenariosWithoutDefinition.map(s => 
      `Scenario "${s.title}" found been in feature file but no step definitions were provide`
    );

    if (errors.length) {
        throw new Error(errors.join('\n\n'));
    }
};
