import { describe, it, expect } from 'vitest';
import { parseJobSalary, matchesSalaryFilter } from '@/components/map/utils';
import { getMarkerHtml } from '@/components/map/markerUtils';

describe('Map Salary & Tactical HUD Rate Classification', () => {
  it('correctly parses hourly rate strings and numbers', () => {
    const rate1 = parseJobSalary('45 zł/h', 'Elektryk budowlany');
    expect(rate1.rateType).toBe('hourly');
    expect(rate1.numericValue).toBe(45);
    expect(rate1.isAboveSzczecinMedian).toBe(true);
    expect(rate1.displayPill).toBe('45 zł/h');

    const rate2 = parseJobSalary(35, 'Pomocnik zbrojarza');
    expect(rate2.rateType).toBe('hourly');
    expect(rate2.numericValue).toBe(35);
    expect(rate2.isAboveSzczecinMedian).toBe(false);
    expect(rate2.displayPill).toBe('35 zł/h');
  });

  it('correctly parses daily rates (dniówka)', () => {
    const daily1 = parseJobSalary('350 zł za dzień', 'Murarz klinkier');
    expect(daily1.rateType).toBe('daily');
    expect(daily1.numericValue).toBe(350);
    expect(daily1.displayPill).toBe('350 zł/dz');
    expect(daily1.isAboveSzczecinMedian).toBe(false);

    const dailyHigh = parseJobSalary('420 zł dniówka', 'Cieśla szalunkowy');
    expect(dailyHigh.rateType).toBe('daily');
    expect(dailyHigh.numericValue).toBe(420);
    expect(dailyHigh.isAboveSzczecinMedian).toBe(true);
  });

  it('correctly parses monthly salaries', () => {
    const monthly = parseJobSalary(8500, 'Kierownik budowy');
    expect(monthly.rateType).toBe('monthly');
    expect(monthly.numericValue).toBe(8500);
    expect(monthly.displayPill).toBe('8.5k zł');
    expect(monthly.isAboveSzczecinMedian).toBe(true);
  });

  it('handles null, empty or non-numeric prices gracefully', () => {
    const empty = parseJobSalary(null);
    expect(empty.rateType).toBe('unknown');
    expect(empty.numericValue).toBeNull();
    expect(empty.displayPill).toBe('Wycena');
    expect(empty.isAboveSzczecinMedian).toBe(false);
  });

  it('filters ads accurately with matchesSalaryFilter', () => {
    expect(matchesSalaryFilter('all', null)).toBe(true);

    expect(matchesSalaryFilter('with_salary', '40 zł/h')).toBe(true);
    expect(matchesSalaryFilter('with_salary', null)).toBe(false);

    expect(matchesSalaryFilter('hourly_standard', '40 zł/h')).toBe(true);
    expect(matchesSalaryFilter('hourly_standard', '350 zł dniówka')).toBe(false);

    expect(matchesSalaryFilter('daily_rate', '300 zł/dzień')).toBe(true);
    expect(matchesSalaryFilter('daily_rate', '45 zł/h')).toBe(false);

    expect(matchesSalaryFilter('high_pay', '50 zł/h')).toBe(true);
    expect(matchesSalaryFilter('high_pay', '25 zł/h')).toBe(false);
    expect(matchesSalaryFilter('high_pay', '400 zł/dzień')).toBe(true);
  });

  it('generates tactical marker HTML with correct badges and rate pills', () => {
    const htmlHourly = getMarkerHtml('budowa', false, false, false, '50 zł/h', false, false, false);
    expect(htmlHourly).toContain('50 zł/h');
    expect(htmlHourly).toContain('TOP');
    expect(htmlHourly).toContain('#10b981');

    const htmlDaily = getMarkerHtml('instalacje', false, false, false, '320 zł dniówka', false, false, false);
    expect(htmlDaily).toContain('320 zł/dz');
  });
});
