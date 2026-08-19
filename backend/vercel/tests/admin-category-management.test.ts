/**
 * Category recommendationRule: a safe, closed enum (never an executable
 * expression) that lets Admin configure how a category's Barber listing is
 * ordered for customer discovery (applyCategoryRecommendationRule, mobile
 * src/features/location/services/recommendation-rules.ts). Covers the
 * validation gate (admin.validation.ts) and createCategory/updateCategory/
 * getCategoriesList (admin.service.ts) against the real Firestore emulator.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createCategory, getCategoriesList, updateCategory } from '../src/admin/admin.service.js';
import { validateRecommendationRule, CATEGORY_RECOMMENDATION_RULES } from '../src/admin/admin.validation.js';
import { db } from '../src/lib/firebase-admin.js';

const ADMIN_UID = 'admin-category-rule-test';
const createdCategoryIds: string[] = [];

async function cleanup() {
  await Promise.all(createdCategoryIds.map((id) => db.collection('categories').doc(id).delete()));
  createdCategoryIds.length = 0;
}

describe('validateRecommendationRule', () => {
  it('accepts every canonical enum value', () => {
    for (const rule of CATEGORY_RECOMMENDATION_RULES) {
      expect(validateRecommendationRule(rule).valid).toBe(true);
    }
  });

  it('accepts undefined (optional field -- create/update may omit it)', () => {
    expect(validateRecommendationRule(undefined).valid).toBe(true);
  });

  it('rejects an arbitrary string, never treating it as an executable expression', () => {
    const result = validateRecommendationRule('nearest; DROP TABLE categories');
    expect(result.valid).toBe(false);
  });

  it('rejects a non-string value', () => {
    expect(validateRecommendationRule(123).valid).toBe(false);
    expect(validateRecommendationRule({}).valid).toBe(false);
  });
});

describe('category recommendationRule persistence (Firestore emulator)', () => {
  afterEach(cleanup);

  it('createCategory defaults recommendationRule to "default" when omitted', async () => {
    const category = await createCategory({ name: `Test Category ${Date.now()}` }, ADMIN_UID);
    createdCategoryIds.push(category.id);

    expect(category.recommendationRule).toBe('default');
  });

  it('createCategory persists an explicitly chosen rule', async () => {
    const category = await createCategory({ name: `Nearest Category ${Date.now()}`, recommendationRule: 'nearest' }, ADMIN_UID);
    createdCategoryIds.push(category.id);

    expect(category.recommendationRule).toBe('nearest');

    const list = await getCategoriesList();
    const persisted = list.find((c) => c.id === category.id);
    expect(persisted?.recommendationRule).toBe('nearest');
  });

  it('updateCategory changes the rule on an existing category', async () => {
    const category = await createCategory({ name: `Update Rule ${Date.now()}` }, ADMIN_UID);
    createdCategoryIds.push(category.id);
    expect(category.recommendationRule).toBe('default');

    const updated = await updateCategory(category.id, { recommendationRule: 'highest_rating' }, ADMIN_UID);
    expect(updated.recommendationRule).toBe('highest_rating');

    const list = await getCategoriesList();
    expect(list.find((c) => c.id === category.id)?.recommendationRule).toBe('highest_rating');
  });

  it('getCategoriesList defaults a pre-migration category (no recommendationRule field at all) to "default"', async () => {
    const docRef = await db.collection('categories').add({
      name: `Legacy Category ${Date.now()}`,
      name_normalized: `legacy category ${Date.now()}`,
      active: true,
      order: 999,
      createdAt: new Date(),
      updatedAt: new Date(),
      // recommendationRule intentionally omitted -- pre-migration document.
    });
    createdCategoryIds.push(docRef.id);

    const list = await getCategoriesList();
    expect(list.find((c) => c.id === docRef.id)?.recommendationRule).toBe('default');
  });
});
