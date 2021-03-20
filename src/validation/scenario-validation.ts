import {
    Options,
    Rule,
} from '../models';

export const checkThatFeatureFileAndStepDefinitionsHaveSameScenarios = (
    scenarioGroup: Rule,
    options: Options
) => {

    if(options && options.errors === false) {
      return
    }

    const scenariosWithoutDefinition = scenarioGroup.scenarios.filter(s => !s.defined);

    const errors = scenariosWithoutDefinition.map(s => 
      `Scenario "${s.title}" found been in feature file but no step definitions were provided`
    );

    if (errors.length) {
        throw new Error(errors.join('\n\n'));
    }
};
