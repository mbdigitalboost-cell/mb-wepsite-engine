/** See app/dashboard/customers/form-state.ts for why this lives outside the "use server" actions.ts. */
export interface CategoryProductsFormState {
  error: string | null;
  success: string | null;
}

export const initialCategoryProductsFormState: CategoryProductsFormState = { error: null, success: null };
