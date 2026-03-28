export default function Panel({ as = 'div', className, style, children, ...props }) {
  const Tag = as
  return (
    <Tag className={className} style={style} {...props}>
      {children}
    </Tag>
  )
}
