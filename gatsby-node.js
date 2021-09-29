const path = require(`path`)
const { execSync } = require('child_process')

exports.onCreateNode = ({ node, getNodesByType, getNode, actions }) => {
  const { createNodeField } = actions

  if (node.internal.type === 'logo' || node.internal.type === 'sourceInfo') {
    const i18nNodes = getNodesByType(`SiteI18n`)
    const defaultLang = i18nNodes[0].defaultLang

    const fileNode = getNode(node.parent)
    const name = fileNode.name
    const isDefault = name === name.split(`.`)[0]
    const lang = isDefault ? defaultLang : name.split(`.`)[1]

    createNodeField({ node, name: `locale`, value: lang })
    createNodeField({ node, name: `isDefault`, value: isDefault })
  }

  if (node.internal.type === 'Mdx') {
    const gitAuthorTime = execSync(
      `git log -1 --pretty=format:%ad --date=format:'%Y-%m-%d @%H:%M:%S' ${node.fileAbsolutePath}`
    ).toString()

    createNodeField({ node, name: `gitAuthorTime`, value: gitAuthorTime })
  }
}

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions
  const detail = await graphql(`
    query {
      allLogo {
        edges {
          node {
            slug
          }
          next {
            slug
          }
          previous {
            slug
          }
        }
      }
    }
  `)
  const support = await graphql(`
    {
      support: allFile(filter: { sourceInstanceName: { eq: "support" } }) {
        nodes {
          childMdx {
            frontmatter {
              slug
            }
          }
        }
      }
    }
  `)

  if (detail.errors) {
    reporter.panicOnBuild(detail.errors)
    return
  }

  if (support.errors) {
    reporter.panicOnBuild(support.errors)
    return
  }

  detail.data.allLogo.edges.forEach(({ node, next, previous }) => {
    createPage({
      path: node.slug,
      component: path.resolve(`./src/templates/logoDetail.js`),
      context: {
        slug: node.slug,
        next,
        previous
      }
    })
  })

  support.data.support.nodes.forEach(({ childMdx: node }) => {
    createPage({
      path: `/support/${node.frontmatter.slug}`,
      component: path.resolve(`./src/templates/support.js`),
      context: {
        slug: node.frontmatter.slug
      }
    })
  })
}

exports.createResolvers = ({ createResolvers }) => {
  const resolvers = {
    logo: {
      styleMode: {
        type: ['logo'],
        resolve: (source, args, context, info) => {
          return context.nodeModel.runQuery({
            query: {
              filter: {
                id: {
                  ne: source.id
                },
                sourceID: {
                  eq: source.sourceID
                },
                version: {
                  eq: source.version
                }
              }
            },
            type: 'logo'
          })
        }
      },
      logoHistory: {
        type: ['logo'],
        resolve: (source, args, context, info) => {
          return context.nodeModel.runQuery({
            query: {
              filter: {
                // version: {
                //   ne: source.version
                // },
                sourceID: {
                  eq: source.sourceID
                },
                style: {
                  eq: 'color'
                }
              }
            },
            type: 'logo'
          })
        }
      },
      detailInfo: {
        type: [`sourceInfo`],
        resolve: (source, args, context, info) => {
          return context.nodeModel.runQuery({
            query: {
              filter: {
                sourceID: {
                  eq: source.sourceID
                }
              }
            },
            type: `sourceInfo`
          })
        }
      }
    }
  }
  createResolvers(resolvers)
}
