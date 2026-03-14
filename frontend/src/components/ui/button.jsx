function classNames(...values) {
  return values.filter(Boolean).join(' ')
}

export function Button({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) {
  return (
    <button
      className={classNames(
        'ui-button',
        `ui-button-${variant}`,
        `ui-button-${size}`,
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
