// Sample plans only: amounts and prices are illustrative placeholders.
export const FOOD_AMOUNT_PRESETS = {
  balanced: {
    label: "Balanced (sample)",
    description: "Sample plan using the default sample amounts",
    amounts: {
      oats: {
        weekly_amount: 500,
        price_per_unit: 0.004,
        enabled: true
      },
      rice: {
        weekly_amount: 1000,
        price_per_unit: 0.003,
        enabled: true
      },
      chicken_breast: {
        weekly_amount: 2,
        price_per_unit: 3.5,
        enabled: true
      },
      eggs: {
        weekly_amount: 12,
        price_per_unit: 0.3,
        enabled: true
      },
      milk: {
        weekly_amount: 1,
        price_per_unit: 4,
        enabled: true
      },
      broccoli: {
        weekly_amount: 1.5,
        price_per_unit: 2,
        enabled: true
      },
      banana: {
        weekly_amount: 7,
        price_per_unit: 0.25,
        enabled: true
      },
      olive_oil: {
        weekly_amount: 14,
        price_per_unit: 0.3,
        enabled: true
      }
    }
  },
  higher_calorie: {
    label: "Higher calorie (sample)",
    description: "Sample plan with 1.5x the default amounts",
    amounts: {
      oats: {
        weekly_amount: 750,
        price_per_unit: 0.004,
        enabled: true
      },
      rice: {
        weekly_amount: 1500,
        price_per_unit: 0.003,
        enabled: true
      },
      chicken_breast: {
        weekly_amount: 3,
        price_per_unit: 3.5,
        enabled: true
      },
      eggs: {
        weekly_amount: 18,
        price_per_unit: 0.3,
        enabled: true
      },
      milk: {
        weekly_amount: 1.5,
        price_per_unit: 4,
        enabled: true
      },
      broccoli: {
        weekly_amount: 2.25,
        price_per_unit: 2,
        enabled: true
      },
      banana: {
        weekly_amount: 10.5,
        price_per_unit: 0.25,
        enabled: true
      },
      olive_oil: {
        weekly_amount: 21,
        price_per_unit: 0.3,
        enabled: true
      }
    }
  }
};
