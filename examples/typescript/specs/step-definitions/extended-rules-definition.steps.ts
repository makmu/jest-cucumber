import { StepDefinitions, loadFeature, defineRuleBasedFeature } from '../../../../src';
import { VendingMachine } from '../../src/vending-machine';

const feature = loadFeature('./examples/typescript/specs/features/extended-rules-definition.feature', {collapseRules: false});

defineRuleBasedFeature(feature, (rule) => {
    let vendingMachine: VendingMachine;

    const myMoney = 0.50;

    rule("Dispenses items if correct amount of money is inserted", (test) => {

        test('Selecting a snack', ({ given, and, when, then }) => {
            given(/^the vending machine has "([^"]*)" in stock$/, (itemName: string) => {
                vendingMachine = new VendingMachine();
                vendingMachine.stockItem(itemName, 1);
            });

            and('I have inserted the correct amount of money', () => {
                vendingMachine.insertMoney(myMoney);
            });

            when(/^I select "(.*)"$/, (itemName: string) => {
                vendingMachine.dispenseItem(itemName);
            });

            then(/^my "(.*)" should be dispensed$/, (itemName: string) => {
                const inventoryAmount = vendingMachine.items[itemName];
                expect(inventoryAmount).toBe(0);
            });
        });

        test('Selecting a beverage', ({ given, and, when, then }) => {
            given(/^the vending machine has "([^"]*)" in stock$/, (itemName: string) => {
                vendingMachine = new VendingMachine();
                vendingMachine.stockItem(itemName, 1);
            });

            and('I have inserted the correct amount of money', () => {
                vendingMachine.insertMoney(myMoney);
            });

            when(/^I select "(.*)"$/, (itemName: string) => {
                vendingMachine.dispenseItem(itemName);
            });

            then(/^my "(.*)" should be dispensed$/, (itemName: string) => {
                const inventoryAmount = vendingMachine.items[itemName];
                expect(inventoryAmount).toBe(0);
            });
        });
    });

    rule("Returns my money if item is out of stock", (test) => {

        test('Selecting a snack', ({ given, and, when, then }) => {
            given(/^the vending machine has no "([^"]*)" in stock$/, (itemName: string) => {
                vendingMachine = new VendingMachine();
                vendingMachine.stockItem(itemName, 0);
            });

            and('I have inserted the correct amount of money', () => {
                vendingMachine.insertMoney(myMoney);
            });

            when(/^I select "(.*)"$/, (itemName: string) => {
                vendingMachine.dispenseItem(itemName);
            });

            then(/^my money should be returned$/, () => {
                const returnedMoney = vendingMachine.moneyReturnSlot;
                expect(returnedMoney).toBe(myMoney);
            });
        });

        test('Selecting a beverage', ({ given, and, when, then }) => {
            given(/^the vending machine has no "([^"]*)" in stock$/, (itemName: string) => {
                vendingMachine = new VendingMachine();
                vendingMachine.stockItem(itemName, 0);
            });

            and('I have inserted the correct amount of money', () => {
                vendingMachine.insertMoney(myMoney);
            });

            when(/^I select "(.*)"$/, (itemName: string) => {
                vendingMachine.dispenseItem(itemName);
            });

            then(/^my money should be returned$/, () => {
                const returnedMoney = vendingMachine.moneyReturnSlot;
                expect(returnedMoney).toBe(myMoney);
            });
        });
    });
});
