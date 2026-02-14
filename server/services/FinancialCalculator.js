/**
 * Financial Calculator Service
 * 
 * Performs all financial calculations for the Sample Entry to Purchase workflow.
 * Includes Sute, Base Rate, Brokerage, EGB, LFIN, Hamali calculations.
 * Supports custom divisor propagation for MD/Loose.
 * 
 * All calculations are optimized for accuracy and performance.
 */

class FinancialCalculator {
  /**
   * Calculate Sute (weight deduction)
   * 
   * Per Bag: Total Sute = Sute Rate × Number of Bags
   * Per Ton: Total Sute = (Actual Net Weight ÷ 1000) × Sute Rate
   * Sute Net Weight = Actual Net Weight - Total Sute
   */
  calculateSute(rate, type, actualNetWeight, bags) {
    let totalSute;

    if (type === 'PER_BAG') {
      totalSute = rate * bags;
    } else if (type === 'PER_TON') {
      totalSute = (actualNetWeight / 1000) * rate;
    } else {
      throw new Error(`Invalid sute type: ${type}`);
    }

    const suteNetWeight = actualNetWeight - totalSute;

    if (suteNetWeight < 0) {
      throw new Error('Sute net weight cannot be negative');
    }

    return {
      totalSute: parseFloat(totalSute.toFixed(2)),
      suteNetWeight: parseFloat(suteNetWeight.toFixed(2))
    };
  }

  /**
   * Calculate Base Rate
   * 
   * PD/Loose + Per Bag: (Sute Net Weight ÷ 75) × Base Rate
   * PD/Loose + Per Quintal: (Sute Net Weight ÷ 100) × Base Rate
   * MD/Loose: (Sute Net Weight ÷ Custom Divisor) × Base Rate
   * PD/WB, MD/WB: Same as PD/Loose
   */
  calculateBaseRate(type, unit, rate, suteNetWeight, customDivisor = null) {
    let divisor;
    let total;
    let storedCustomDivisor = null;

    // Determine divisor based on type and unit
    if (type === 'MD_LOOSE' && customDivisor) {
      divisor = customDivisor;
      storedCustomDivisor = customDivisor; // Store for propagation
    } else if (unit === 'PER_BAG') {
      divisor = 75;
    } else if (unit === 'PER_QUINTAL') {
      divisor = 100;
    } else {
      throw new Error(`Invalid base rate configuration: type=${type}, unit=${unit}`);
    }

    total = (suteNetWeight / divisor) * rate;

    return {
      total: parseFloat(total.toFixed(2)),
      customDivisor: storedCustomDivisor
    };
  }

  /**
   * Calculate Brokerage
   * 
   * Per Bag: Brokerage Rate × Number of Bags
   * Per Quintal: (Actual Net Weight ÷ Divisor) × Brokerage Rate
   * Divisor = Custom Divisor (if MD/Loose) or 100
   */
  calculateBrokerage(rate, unit, actualNetWeight, bags, customDivisor = null) {
    let total;

    if (unit === 'PER_BAG') {
      total = rate * bags;
    } else if (unit === 'PER_QUINTAL') {
      const divisor = customDivisor || 100;
      total = (actualNetWeight / divisor) * rate;
    } else {
      throw new Error(`Invalid brokerage unit: ${unit}`);
    }

    return parseFloat(total.toFixed(2));
  }

  /**
   * Calculate EGB (Empty Gunny Bags)
   * 
   * Only applicable for PD/Loose and MD/Loose
   * EGB Total = EGB Rate × Number of Bags
   */
  calculateEGB(rate, bags, baseRateType) {
    // EGB only applies to PD/Loose and MD/Loose
    if (baseRateType !== 'PD_LOOSE' && baseRateType !== 'MD_LOOSE') {
      return null;
    }

    const total = rate * bags;
    return parseFloat(total.toFixed(2));
  }

  /**
   * Calculate LFIN (Loading/Freight charges)
   * 
   * Per Bag: LFIN Rate × Number of Bags
   * Per Quintal: (Actual Net Weight ÷ Divisor) × LFIN Rate
   * Divisor = Custom Divisor (if MD/Loose) or 100
   */
  calculateLFIN(rate, unit, actualNetWeight, bags, customDivisor = null) {
    let total;

    if (unit === 'PER_BAG') {
      total = rate * bags;
    } else if (unit === 'PER_QUINTAL') {
      const divisor = 100;
      total = (actualNetWeight / divisor) * rate;
    } else {
      throw new Error(`Invalid LFIN unit: ${unit}`);
    }

    return parseFloat(total.toFixed(2));
  }

  /**
   * Calculate Hamali (Labor/handling charges)
   * 
   * Per Bag: Hamali Rate × Number of Bags
   * Per Quintal: (Actual Net Weight ÷ Divisor) × Hamali Rate
   * Divisor = Custom Divisor (if MD/Loose) or 100
   */
  calculateHamali(rate, unit, actualNetWeight, bags, customDivisor = null) {
    let total;

    if (unit === 'PER_BAG') {
      total = rate * bags;
    } else if (unit === 'PER_QUINTAL') {
      const divisor = 100;
      total = (actualNetWeight / divisor) * rate;
    } else {
      throw new Error(`Invalid Hamali unit: ${unit}`);
    }

    return parseFloat(total.toFixed(2));
  }

  /**
   * Calculate Total Amount and Average
   * 
   * Total Amount = Sum of all calculations
   * Average = Total Amount ÷ Sute Net Weight
   */
  calculateTotalAndAverage(calculations) {
    const {
      totalSute,
      baseRateTotal,
      brokerageTotal,
      egbTotal,
      lfinTotal,
      hamaliTotal,
      suteNetWeight
    } = calculations;

    // Sum all components (EGB may be null)
    // Sute is NOT added to the total amount as it's a weight deduction
    const totalAmount =
      (baseRateTotal || 0) +
      (brokerageTotal || 0) +
      (egbTotal || 0) +
      (lfinTotal || 0) +
      (hamaliTotal || 0);

    // Calculate average
    if (suteNetWeight <= 0) {
      throw new Error('Sute net weight must be greater than zero for average calculation');
    }

    const average = totalAmount / suteNetWeight;

    return {
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      average: parseFloat(average.toFixed(2))
    };
  }

  /**
   * Perform complete financial calculation
   * 
   * This is the main method that orchestrates all calculations
   */
  calculateComplete(params) {
    const {
      // Inventory data
      actualNetWeight,
      bags,

      // Sute
      suteRate,
      suteType,

      // Base Rate
      baseRateType,
      baseRateUnit,
      baseRateValue,
      customDivisor,

      // Brokerage
      brokerageRate,
      brokerageUnit,

      // EGB
      egbRate,

      // LFIN
      lfinRate,
      lfinUnit,

      // Hamali
      hamaliRate,
      hamaliUnit
    } = params;

    // Step 1: Calculate Sute
    const suteResult = this.calculateSute(suteRate, suteType, actualNetWeight, bags);

    // Step 2: Calculate Base Rate
    const baseRateResult = this.calculateBaseRate(
      baseRateType,
      baseRateUnit,
      baseRateValue,
      suteResult.suteNetWeight,
      customDivisor
    );

    // Get custom divisor for propagation
    const propagatedDivisor = baseRateResult.customDivisor;

    // Step 3: Calculate Brokerage
    const brokerageTotal = this.calculateBrokerage(
      brokerageRate,
      brokerageUnit,
      actualNetWeight,
      bags,
      propagatedDivisor
    );

    // Step 4: Calculate EGB (may be null)
    const egbTotal = egbRate ? this.calculateEGB(egbRate, bags, baseRateType) : null;

    // Step 5: Calculate LFIN
    const lfinTotal = this.calculateLFIN(
      lfinRate,
      lfinUnit,
      actualNetWeight,
      bags,
      propagatedDivisor
    );

    // Step 6: Calculate Hamali
    const hamaliTotal = this.calculateHamali(
      hamaliRate,
      hamaliUnit,
      actualNetWeight,
      bags,
      propagatedDivisor
    );

    // Step 7: Calculate Total and Average
    const finalResult = this.calculateTotalAndAverage({
      totalSute: suteResult.totalSute,
      baseRateTotal: baseRateResult.total,
      brokerageTotal,
      egbTotal,
      lfinTotal,
      hamaliTotal,
      suteNetWeight: suteResult.suteNetWeight
    });

    // Return complete calculation result
    return {
      // Sute
      totalSute: suteResult.totalSute,
      suteNetWeight: suteResult.suteNetWeight,

      // Base Rate
      baseRateTotal: baseRateResult.total,
      customDivisor: propagatedDivisor,

      // Other calculations
      brokerageTotal,
      egbTotal,
      lfinTotal,
      hamaliTotal,

      // Final
      totalAmount: finalResult.totalAmount,
      average: finalResult.average
    };
  }
}

module.exports = new FinancialCalculator();
