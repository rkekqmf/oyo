import * as TabsPrimitive from '@radix-ui/react-tabs'

export function Tabs({ children, value, onValueChange }) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange}>
      {children}
    </TabsPrimitive.Root>
  )
}

export function TabsList({ children }) {
  return <TabsPrimitive.List className="ui-tabs-list">{children}</TabsPrimitive.List>
}

export function TabsTrigger({ children, value }) {
  return (
    <TabsPrimitive.Trigger value={value} className="ui-tabs-trigger">
      {children}
    </TabsPrimitive.Trigger>
  )
}

export function TabsContent({ children, value, className = '' }) {
  return (
    <TabsPrimitive.Content value={value} className={`ui-tabs-content ${className}`.trim()}>
      {children}
    </TabsPrimitive.Content>
  )
}
