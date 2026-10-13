//! The subset of Mustache that play/index.html uses: `{{ var }}` (HTML-escaped like mustache.js),
//! `{{{ var }}}` (raw), and `{{#section}}...{{/section}}` over a non-empty string or a list.

use std::collections::HashMap;

#[derive(Debug, Clone)]
enum Token {
    Text(String),
    Var { name: String, escape: bool },
    Section { name: String, inner: Vec<Token> },
}

#[derive(Debug, Clone)]
pub struct Template(Vec<Token>);

pub enum Value {
    Str(String),
    List(Vec<HashMap<&'static str, String>>),
}

pub type Context = HashMap<&'static str, Value>;

#[derive(Debug, PartialEq, Eq)]
pub struct ParseError(pub String);

impl Template {
    pub fn parse(source: &str) -> Result<Self, ParseError> {
        let mut stack: Vec<(String, Vec<Token>)> = vec![(String::new(), Vec::new())];
        let mut rest = source;
        while let Some(start) = rest.find("{{") {
            stack.last_mut().expect("root").1.push(Token::Text(rest[..start].to_owned()));
            let after = &rest[start..];
            let (raw, end) = if after.starts_with("{{{") {
                (true, after.find("}}}").map(|e| (e, 3)))
            } else {
                (false, after.find("}}").map(|e| (e, 2)))
            };
            let Some((end, close_len)) = end else {
                return Err(ParseError("unclosed tag".into()));
            };
            let tag = after[if raw { 3 } else { 2 }..end].trim();
            rest = &after[end + close_len..];
            if raw {
                stack.last_mut().expect("root").1.push(Token::Var {
                    name: tag.to_owned(),
                    escape: false,
                });
            } else if let Some(name) = tag.strip_prefix('#') {
                stack.push((name.trim().to_owned(), Vec::new()));
            } else if let Some(name) = tag.strip_prefix('/') {
                let (open, inner) = stack.pop().expect("root");
                if stack.is_empty() || open != name.trim() {
                    return Err(ParseError(format!("unexpected closing tag {name}")));
                }
                stack.last_mut().expect("parent").1.push(Token::Section { name: open, inner });
            } else if let Some(name) = tag.strip_prefix('&') {
                stack.last_mut().expect("root").1.push(Token::Var {
                    name: name.trim().to_owned(),
                    escape: false,
                });
            } else if !tag.starts_with('!') {
                stack.last_mut().expect("root").1.push(Token::Var {
                    name: tag.to_owned(),
                    escape: true,
                });
            }
        }
        stack.last_mut().expect("root").1.push(Token::Text(rest.to_owned()));
        if stack.len() != 1 {
            return Err(ParseError("unclosed section".into()));
        }
        Ok(Template(stack.pop().expect("root").1))
    }

    pub fn render(&self, context: &Context) -> String {
        let mut out = String::new();
        render(&self.0, context, None, &mut out);
        out
    }
}

fn render(tokens: &[Token], ctx: &Context, item: Option<&HashMap<&'static str, String>>, out: &mut String) {
    let lookup = |name: &str| -> Option<String> {
        item.and_then(|i| i.get(name).cloned()).or_else(|| match ctx.get(name) {
            Some(Value::Str(s)) => Some(s.clone()),
            _ => None,
        })
    };
    for t in tokens {
        match t {
            Token::Text(s) => out.push_str(s),
            Token::Var { name, escape } => {
                let v = lookup(name).unwrap_or_default();
                if *escape {
                    escape_html(&v, out);
                } else {
                    out.push_str(&v);
                }
            }
            Token::Section { name, inner } => match ctx.get(name.as_str()) {
                Some(Value::List(items)) => {
                    for i in items {
                        render(inner, ctx, Some(i), out);
                    }
                }
                _ => {
                    if lookup(name).is_some_and(|v| !v.is_empty()) {
                        render(inner, ctx, item, out);
                    }
                }
            },
        }
    }
}

/// mustache.js escapeHtml.
fn escape_html(s: &str, out: &mut String) {
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            '/' => out.push_str("&#x2F;"),
            '`' => out.push_str("&#x60;"),
            '=' => out.push_str("&#x3D;"),
            c => out.push(c),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_variables_sections_and_lists() {
        let t = Template::parse(
            "<t>{{ title }}</t>{{{ script }}}{{#on}}[{{ x }}]{{/on}}{{#off}}no{{/off}}{{#items}}<i {{ src }}/>{{/items}}",
        )
        .unwrap();
        let mut ctx = Context::new();
        ctx.insert("title", Value::Str("a/b".into()));
        ctx.insert("script", Value::Str("<s>".into()));
        ctx.insert("on", Value::Str("yes".into()));
        ctx.insert("x", Value::Str("1".into()));
        ctx.insert("items", Value::List(vec![HashMap::from([("src", "s1".to_owned())])]));
        assert_eq!(t.render(&ctx), "<t>a&#x2F;b</t><s>[1]<i s1/>");
    }

    #[test]
    fn rejects_broken_templates() {
        assert!(Template::parse("{{#a}}").is_err());
        assert!(Template::parse("{{ a").is_err());
        assert!(Template::parse("{{#a}}{{/b}}").is_err());
    }
}
