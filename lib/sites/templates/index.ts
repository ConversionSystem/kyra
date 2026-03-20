// Template system — public API
export { assemblePage } from './assembler';
export type { AssemblePageOptions } from './assembler';
export { INDUSTRY_RECIPES, getRecipeForIndustry } from './recipes';
export type { SectionRecipe } from './recipes';
export { TEMPLATE_GALLERY, getTemplatesForIndustry, getTemplateById } from './gallery';
export type { TemplatePreview } from './gallery';
