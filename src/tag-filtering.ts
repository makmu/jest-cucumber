import { Feature, Scenario, ScenarioOutline } from './models';

type TagFilterFunction = (tags: string[]) => boolean;

const cachedTagFilterFunctions: { [tag: string]: TagFilterFunction } = {};

const convertTagFilterExpressionToFunction = (tagFilterExpression: string) => {
    const tagRegex = /(\@[A-Za-z-_0-9]+)/g;
    const tags: string[] = [];
    let match: RegExpMatchArray | null = null;
    let newTagFilterExpression = tagFilterExpression + '';

    do {
        match = tagRegex.exec(tagFilterExpression);

        if (match) {
            // tslint:disable-next-line:max-line-length
            newTagFilterExpression = newTagFilterExpression.replace(match[1], `(tags.indexOf("${match[1].toLowerCase()}")!==-1)`);

            if (tags.indexOf(match[1]) !== -1) {
                tags.push(match[1]);
            }
        }
    } while (match);

    newTagFilterExpression = newTagFilterExpression.replace(/(\s+not|not\s+|\s+not\s+)/g, ' ! ');
    newTagFilterExpression = newTagFilterExpression.replace(/(\s+or|or\s+|\s+or\s+)/g, ' || ');
    newTagFilterExpression = newTagFilterExpression.replace(/(\s+and|and\s+|\s+and\s+)/g, ' && ');
    newTagFilterExpression = newTagFilterExpression.replace(/[ \t\n\r]+/g, '');

    let tagFilterFunction: TagFilterFunction;

    try {
        tagFilterFunction = new Function('tags', `return ${newTagFilterExpression};`) as TagFilterFunction;
        tagFilterFunction([]);
    } catch (error) {
        throw new Error(`Could not parse tag filter "${tagFilterExpression}"`);
    }

    return tagFilterFunction;
};

const checkIfScenarioMatchesTagFilter = (
    tagFilterExpression: string,
    feature: Feature,
    scenario: Scenario | ScenarioOutline,
) => {
    const featureAndScenarioTags = [
        ...scenario.tags.map((tag) => tag.toLowerCase()),
        ...feature.tags.map((tag) => tag.toLowerCase()),
    ];

    let tagFilterFunction = cachedTagFilterFunctions[tagFilterExpression];

    if (!tagFilterFunction) {
        tagFilterFunction = convertTagFilterExpressionToFunction(tagFilterExpression);
        cachedTagFilterFunctions[tagFilterExpression] = tagFilterFunction;
    }

    return tagFilterFunction(featureAndScenarioTags);
};

const setScenarioSkipped = (feature: Feature, scenario: Scenario, tagFilter: string) => {
    const skippedViaTagFilter = !checkIfScenarioMatchesTagFilter(
        tagFilter,
        feature,
        scenario,
    );

    return {
        ...scenario,
        skippedViaTagFilter,
    };
};

export const applyTagFilters = (
    feature: Feature,
    tagFilter: string | undefined
): Feature => {
    if (tagFilter === undefined) {
        return feature;
    }

    const scenarios = feature.scenarios.map((scenario) => setScenarioSkipped(feature, scenario, tagFilter));
    const scenarioOutlines = feature.scenarioOutlines
        .map((scenarioOutline) => {
            return {
                ...setScenarioSkipped(feature, scenarioOutline, tagFilter),
                scenarios: scenarioOutline.scenarios.map((scenario) => setScenarioSkipped(feature, scenario, tagFilter)),
            };
        });
    const rules = feature.rules.map((rule) => ({
      ...rule,
      scenarios: rule.scenarios.map(scenario => setScenarioSkipped(feature, scenario, tagFilter))
    }) )

    return {
        ...feature,
        scenarios,
        scenarioOutlines,
    } as Feature;
};
