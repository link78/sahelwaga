import SupplierForm from '../_components/SupplierForm';

export default function NewSupplierPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">New Supplier</h1>
      <p className="mt-1 text-sm text-brand-neutral-500">
        Add a new supplier to the system. They will start as a Prospect.
      </p>
      <div className="mt-8">
        <SupplierForm mode="create" />
      </div>
    </div>
  );
}
