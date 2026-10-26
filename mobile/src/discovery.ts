import type { FoodProduct } from './openFoodFacts';
import { productProfile, matchesProfile } from './alternatives';
import { productDataStatus } from './productDataStatus';

/** Only directly refreshed barcode records may qualify; callers must not pass search hits. */
export function verifiedProcessingDiscovery(source: FoodProduct, candidate: FoodProduct): boolean {
  const profile = productProfile(source);
  if (!profile || candidate.code === source.code || !matchesProfile(candidate, profile)) return false;
  if (source.nova === null || candidate.nova === null || candidate.nova >= source.nova) return false;
  const sourceStatus=productDataStatus(source);
  const candidateStatus=productDataStatus(candidate);
  if (sourceStatus.issues.length || candidateStatus.issues.length ||
      sourceStatus.cautions?.length || candidateStatus.cautions?.length) return false;
  const gluten = (p:FoodProduct) => /glutenfri|gluten[ -]*free/i.test(p.name);
  const lactose = (p:FoodProduct) => /laktosefri|lactose[ -]*free/i.test(p.name);
  return gluten(source) === gluten(candidate) && lactose(source) === lactose(candidate);
}
