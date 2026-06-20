/* eslint-disable import/no-extraneous-dependencies, global-require -- build config */
/**
 * Use PostCSS config file so Tailwind runs reliably with react-scripts 5 / postcss-loader.
 * Inline plugins in CRACO alone can fail to merge with CRA's postcss chain.
 */
module.exports = {
    style: {
        postcss: {
            mode: 'file'
        }
    },
    webpack: {
        configure: (webpackConfig) => {
            webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
                (plugin) => plugin.constructor.name !== 'ModuleScopePlugin'
            )
            return webpackConfig
        }
    }
}
