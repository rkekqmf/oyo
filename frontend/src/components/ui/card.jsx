function classNames(...values) {
  return values.filter(Boolean).join(' ')
}

export function Card({ children, className = '' }) {
  return <section className={classNames('ui-card', className)}>{children}</section>
}

export function CardHeader({ children, className = '' }) {
  return <header className={classNames('ui-card-header', className)}>{children}</header>
}

export function CardTitle({ children, className = '' }) {
  return <h2 className={classNames('ui-card-title', className)}>{children}</h2>
}

export function CardDescription({ children, className = '' }) {
  return <p className={classNames('ui-card-description', className)}>{children}</p>
}

export function CardContent({ children, className = '' }) {
  return <div className={classNames('ui-card-content', className)}>{children}</div>
}
