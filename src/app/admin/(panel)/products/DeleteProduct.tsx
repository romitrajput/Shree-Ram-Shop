import { deleteProduct } from "../actions";

/** Two-step delete: open, then confirm. Products with past orders are hidden instead (see deleteProduct). */
export function DeleteProduct({ id, name }: { id: string; name: string }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer py-2 font-semibold text-khata">Delete</summary>
      <form action={deleteProduct} className="mt-1">
        <input type="hidden" name="id" value={id} />
        <button className="btn-danger !py-2">Yes, delete {name}</button>
      </form>
    </details>
  );
}
