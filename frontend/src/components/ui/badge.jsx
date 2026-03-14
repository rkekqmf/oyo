function classNames(...values) {
  return values.filter(Boolean).join(' ')
}

export function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={classNames('ui-badge', `ui-badge-${variant}`, className)}>
      {children}
    </span>
  )
}
