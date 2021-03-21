import { loadFeature, defineFeature} from '../../../../src';
import { StepDefinitionFunction } from '../../../../src/feature-definition-creation';
import { VendingMachine } from '../../src/vending-machine';

const feature = loadFeature('./examples/typescript/specs/features/tag-filtering.feature', {
  collapseRules: false,
  tagFilter: "@included and not @excluded"
});

defineFeature(feature, ({rule}) => {
    let vendingMachine: VendingMachine;

    const myMoney = 0.50;

    const givenTheVendingMachineHasXInStock = (given: StepDefinitionFunction) => {
        given(/^the vending machine has "([^"]*)" in stock$/, (itemName: string) => {
            vendingMachine = new VendingMachine();
            vendingMachine.stockItem(itemName, 1);
        });
    };

    const givenTheVendingMachineHasNoXInStock = (given: StepDefinitionFunction) => {
        given(/^the vending machine has no "([^"]*)" in stock$/, (itemName: string) => {
            vendingMachine = new VendingMachine();
            vendingMachine.stockItem(itemName, 0);
        });
    }

    const givenIHaveInsertedTheCorrectAmountOfMoney = (given: StepDefinitionFunction) => {
        given('I have inserted the correct amount of money', () => {
            vendingMachine.insertMoney(myMoney);
        });
    };

    const whenISelectX = (when: StepDefinitionFunction) => {
        when(/^I select "(.*)"$/, (itemName: string) => {
            vendingMachine.dispenseItem(itemName);
        });
    };

    const thenXShouldBeDespensed = (then: StepDefinitionFunction) => {
        then(/^my "(.*)" should be dispensed$/, (itemName: string) => {
            const inventoryAmount = vendingMachine.items[itemName];
            expect(inventoryAmount).toBe(0);
        });
    }

    const thenMyMoneyShouldBeReturned = (then: StepDefinitionFunction) => {
        then(/^my money should be returned$/, () => {
            const returnedMoney = vendingMachine.moneyReturnSlot;
            expect(returnedMoney).toBe(myMoney);
        });
    }

    rule("Dispenses items if correct amount of money is inserted", (test) => {

        test('Selecting a snack', ({ given, when, then }) => {
            givenTheVendingMachineHasXInStock(given);
            givenIHaveInsertedTheCorrectAmountOfMoney(given);
            whenISelectX(when);
            thenXShouldBeDespensed(then);
        });
    });

    rule("Returns my money if item is out of stock", (test) => {

        test('Selecting a beverage', ({ given, when, then }) => {
            givenTheVendingMachineHasNoXInStock(given);
            givenIHaveInsertedTheCorrectAmountOfMoney(given);
            whenISelectX(when);
            thenMyMoneyShouldBeReturned(then);
        });
    });
});
