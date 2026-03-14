function classNames(...values) {
  return values.filter(Boolean).join(' ')
}

export function Input({ className = '', ...props }) {
  return <input className={classNames('ui-input', className)} {...props} />
}
