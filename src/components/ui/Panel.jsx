export default function Panel({ as: Component = 'div', className, style, children, ...props }) {
  return (
    <Component className={className} style={style} {...props}>
      {children}
    </Component>
  )
}
