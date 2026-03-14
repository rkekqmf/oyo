function classNames(...values) {
  return values.filter(Boolean).join(' ')
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={classNames('ui-select', className)} {...props}>
      {children}
    </select>
  )
}
